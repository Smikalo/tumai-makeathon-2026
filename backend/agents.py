from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from pydantic import BaseModel, Field
import os

# Initialize local Ollama
llm = ChatOllama(
    model="llama3.1",
    temperature=0,
    base_url="http://localhost:11434"
)

# --- Meta-Tools for Orchestration ---

class DelegateToAgentB(BaseModel):
    """Call this tool if you need to perform an action (Book Room, Mensa, Moodle, etc.) 
    and you don't have a specific tool for it yet."""
    missing_tool_spec: str = Field(
        description="Detailed textual technical spec. DO NOT use JSON/Dict here."
    )

class LaunchBrowserLogin(BaseModel):
    """Launch a headless browser to perform a TUM Shibboleth SSO login."""
    target_service: str = Field(description="The TUM service to log into, e.g. 'TUMonline' or 'Moodle'")

# Agent A (Orchestrator) Prompt
agent_a_prompt = ChatPromptTemplate.from_messages([
    ("system", 
     "You are Agent A (Orchestrator). You manage the user's request.\n"
     "FLOW FOR PRIVATE DATA:\n"
     "1. IF CREDENTIALS MISSING: Use 'LaunchBrowserLogin' to ask the user for their TUM ID and Password.\n"
     "2. IF CREDENTIALS FOUND BUT NO LOGIN TOOL: Use 'DelegateToAgentB' to write a Playwright script that performs the real Shibboleth SSO login.\n"
     "3. IF LOGIN TOOL EXISTS: Call the generated login tool using the provided credentials.\n"
     "4. ONCE LOGGED IN: Proceed to fetch private data (grades, etc.).\n\n"
     "TUM Knowledge:\n"
     "- Shibboleth SSO is the gateway to all private data.\n"
     "Always verify the tool output and present it to the user."
    ),
    MessagesPlaceholder(variable_name="messages"),
])

# Agent B (Coder/Integrator) Prompt
agent_b_prompt = ChatPromptTemplate.from_messages([
    ("system", 
     "You are Agent B (Coder/Integrator). Your job is to write a Python function named `run` that executes a specific TUM integration.\n"
     "RULES:\n"
     "1. Return ONLY raw Python code. No markdown blocks.\n"
     "2. You MUST define a function: `def run(**kwargs) -> dict:`\n"
     "3. The return dictionary MUST follow this structure:\n"
     "   {{'status': 'success', 'message': '...', 'card': {{'type': '...', 'title': '...', 'body': '...', 'meta': '...', 'link': '...'}}}}\n"
     "4. For REAL SHIBBOLETH LOGIN:\n"
     "   - Use the `playwright` object (provided in local scope) to perform the login.\n"
     "   - `with playwright.chromium.launch(headless=True) as browser:`\n"
     "   - `context = browser.new_context()`\n"
     "   - `page = context.new_page()`\n"
     "   - `page.goto('https://campus.tum.de/tumonline/webnav.ini')`\n"
     "   - `page.fill('input#username', kwargs.get('tum_id', ''))`\n"
     "   - `page.fill('input#password', kwargs.get('password', ''))`\n"
     "   - `page.click('button[name=\"_eventId_proceed\"]')`\n"
     "   - `page.wait_for_url('**/webnav.ini*', timeout=30000)`\n"
     "   - Capture the session state or just confirm successful navigation.\n\n"
     "RAG Context:\n{context}"
    ),
    ("user", 
     "Technical Specification from Agent A:\n{missing_tool_spec}\n\n"
     "Provide the Python code for the `run` function."
     "{error_traceback}"
    )
])

agent_b_chain = agent_b_prompt | llm
