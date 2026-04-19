import os
import uuid
import traceback
import json
import re
import importlib.util
import playwright.sync_api as p_sync
from typing import TypedDict, Annotated, List, Any, Dict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, ToolMessage
from langchain_core.tools import StructuredTool
from backend.agents import agent_a_prompt, agent_b_prompt, llm, DelegateToAgentB, LaunchBrowserLogin
from backend.rag import query_tum_api_context
from langchain_core.runnables import RunnableConfig

# --- State Definition ---
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    missing_tool_spec: str
    generated_code: str
    error_traceback: str
    user_context: Dict[str, Any]

# --- Dynamic Tool Runtime ---
def load_mcp_tools() -> List[StructuredTool]:
    tools = []
    tools_dir = "backend/mcp_tools"
    if not os.path.exists(tools_dir):
        return []
    
    for filename in os.listdir(tools_dir):
        if filename.endswith(".md"):
            filepath = os.path.join(tools_dir, filename)
            with open(filepath, "r") as f:
                content = f.read()
                code_match = re.search(r"```python\n(.*?)```", content, re.DOTALL)
                if not code_match:
                    continue
                code = code_match.group(1)
                tool_name = filename.replace(".md", "").replace("tool_", "")
                # Wrap execution in a function
                def create_tool_fn(source_code, name):
                    def tool_fn(**kwargs):
                        local_scope = {"playwright": p_sync}
                        exec(source_code, globals(), local_scope)
                        if "run" not in local_scope:
                            return {"status": "error", "message": "No 'run' function found in generated code."}
                        return local_scope["run"](**kwargs)
                    return tool_fn

                tools.append(StructuredTool.from_function(
                    func=create_tool_fn(code, tool_name),
                    name=tool_name,
                    description=f"Dynamically generated TUM integration tool: {tool_name}"
                ))
    return tools

# --- Nodes ---
def orchestrator_node(state: AgentState, config: RunnableConfig):
    mcp_tools = load_mcp_tools()
    tools_to_bind = mcp_tools + [DelegateToAgentB, LaunchBrowserLogin]
    
    chain = agent_a_prompt | llm.bind_tools(tools_to_bind)
    
    messages = state["messages"]
    if len(messages) > 10:
        messages = [messages[0]] + messages[-6:]
        
    response = chain.invoke({"messages": messages}, config)
    return {"messages": [response], "error_traceback": "", "user_context": state.get("user_context", {})}

def coder_node(state: AgentState, config: RunnableConfig):
    spec = state.get("missing_tool_spec", "")
    if not spec:
        last_message = state["messages"][-1]
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            for tc in last_message.tool_calls:
                if tc["name"] == "DelegateToAgentB":
                    raw_spec = tc["args"].get("missing_tool_spec", "")
                    if isinstance(raw_spec, (dict, list)):
                        spec = json.dumps(raw_spec)
                    else:
                        spec = str(raw_spec)
                    break

    err = state.get("error_traceback", "")
    context = query_tum_api_context(spec)
    
    prompt_val = agent_b_prompt.invoke({
        "missing_tool_spec": spec,
        "context": context,
        "error_traceback": f"\n\nFIX THIS ERROR:\n{err}" if err else ""
    })
    response = llm.invoke(prompt_val, config)
    
    code = response.content.strip()
    if "```python" in code:
        code_match = re.search(r"```python\n(.*?)```", code, re.DOTALL)
        if code_match:
            code = code_match.group(1)
    
    tool_slug = re.sub(r'[^a-z0-9]', '_', spec.lower()[:20]).strip('_')
    filepath = f"backend/mcp_tools/tool_{tool_slug}.md"
    
    os.makedirs("backend/mcp_tools", exist_ok=True)
    with open(filepath, "w") as f:
        f.write(f"```python\n{code}\n```")
    
    return {"generated_code": code, "error_traceback": ""}

def executor_node(state: AgentState):
    last_message = state["messages"][-1]
    mcp_tools = {t.name: t for t in load_mcp_tools()}
    user_context = state.get("user_context", {})
    
    responses = []
    error_trace = ""
    for tc in last_message.tool_calls:
        if tc["name"] == "LaunchBrowserLogin":
            # If we already have credentials, we shouldn't be calling this AS a meta-tool,
            # but rather Agent A should be calling a GENERATED tool to do the login.
            # However, for simplicity, if we don't have credentials, ask for them.
            if not user_context.get("tum_id") or not user_context.get("password"):
                responses.append(ToolMessage(
                    content=json.dumps({
                        "type": "action_request",
                        "action": {
                            "id": tc["id"],
                            "taskId": "login-task",
                            "label": "Login to TUMonline",
                            "riskLevel": "high",
                            "detail": "The agent will use Playwright to log into the real TUM portal. Please provide your TUM ID and Password.",
                            "consequence": "Your credentials will be used only once to perform the SSO handshake.",
                            "needsInput": True,
                            "inputPlaceholder": "format: your_id:your_password"
                        }
                    }),
                    tool_call_id=tc["id"]
                ))
                continue
            else:
                # If we have them but are still calling LaunchBrowserLogin, it means
                # Agent A doesn't have a specific tool yet. Delegate to Agent B.
                responses.append(ToolMessage(
                    content="Credentials found. Please delegate to Agent B to write the login tool.",
                    tool_call_id=tc["id"]
                ))
                continue

        if tc["name"] in mcp_tools:
            try:
                combined_args = {**tc["args"], **user_context}
                # Inject playwright into the tool function context if needed
                # (Already done in load_mcp_tools create_tool_fn)
                res = mcp_tools[tc["name"]].invoke(combined_args)
                responses.append(ToolMessage(content=json.dumps(res), tool_call_id=tc["id"]))
            except Exception:
                error_trace = traceback.format_exc()
                responses.append(ToolMessage(content=f"Runtime Error: {error_trace}", tool_call_id=tc["id"]))
    
    return {"messages": responses, "error_traceback": error_trace}

def route_after_orchestrator(state: AgentState):
    last_msg = state["messages"][-1]
    if not last_msg.tool_calls:
        return END
    if any(tc["name"] in ["DelegateToAgentB", "LaunchBrowserLogin"] for tc in last_msg.tool_calls):
        return "agent_b" if any(tc["name"] == "DelegateToAgentB" for tc in last_msg.tool_calls) else "executor"
    return "executor"

def route_after_executor(state: AgentState):
    if state.get("error_traceback"):
        return "agent_b"
    return "agent_a"

# --- Build Graph ---
memory = MemorySaver()
workflow = StateGraph(AgentState)
workflow.add_node("agent_a", orchestrator_node)
workflow.add_node("agent_b", coder_node)
workflow.add_node("executor", executor_node)

workflow.set_entry_point("agent_a")
workflow.add_conditional_edges("agent_a", route_after_orchestrator, {"agent_b": "agent_b", "executor": "executor", END: END})
workflow.add_edge("agent_b", "agent_a")
workflow.add_conditional_edges("executor", route_after_executor, {"agent_b": "agent_b", "agent_a": "agent_a"})

app_graph = workflow.compile(checkpointer=memory)
