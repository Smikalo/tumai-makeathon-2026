import json
import asyncio
import datetime
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

# Import graph
from backend.graph import app_graph

app = FastAPI(title="Campus Co-Pilot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Campus Co-Pilot Backend Running"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_event(self, websocket: WebSocket, event_type: str, payload: dict):
        try:
            msg = {"type": event_type, **payload}
            await websocket.send_json(msg)
        except Exception:
            pass

manager = ConnectionManager()

def get_timestamp():
    return datetime.datetime.now().strftime("%H:%M:%S")

async def run_agent(content, session_id, websocket):
    config = {"configurable": {"thread_id": session_id}, "recursion_limit": 50}
    task_id = f"task-{uuid.uuid4().hex[:4]}"

    await manager.send_event(websocket, "task_started", {
        "taskId": task_id,
        "label": "Analyzing request..."
    })
    
    await manager.send_event(websocket, "trace_line", {
        "taskId": task_id,
        "line": {
            "id": uuid.uuid4().hex[:8],
            "timestamp": get_timestamp(),
            "tag": "PLAN",
            "text": "Routing to Multi-Agent Graph..."
        }
    })

    inputs = {"messages": [HumanMessage(content=content)]}
    
    async for event in app_graph.astream_events(inputs, config, version="v2"):
        kind = event["event"]
        
        if kind == "on_tool_start":
            tool_name = event["name"]
            await manager.send_event(websocket, "trace_line", {
                "taskId": task_id,
                "line": {
                    "id": uuid.uuid4().hex[:8],
                    "timestamp": get_timestamp(),
                    "tag": "TOOL",
                    "text": f"Spawning tool: {tool_name}"
                }
            })
        elif kind == "on_tool_end":
            tool_name = event["name"]
            await manager.send_event(websocket, "trace_line", {
                "taskId": task_id,
                "line": {
                    "id": uuid.uuid4().hex[:8],
                    "timestamp": get_timestamp(),
                    "tag": "OK",
                    "text": f"Tool {tool_name} completed."
                }
            })
        elif kind == "on_chain_end" and event.get("name") == "coder_node":
            await manager.send_event(websocket, "trace_line", {
                "taskId": task_id,
                "line": {
                    "id": uuid.uuid4().hex[:8],
                    "timestamp": get_timestamp(),
                    "tag": "LLM",
                    "text": "Agent B (Coder) finished writing integration."
                }
            })
        
    state = app_graph.get_state(config)
    cards = []
    if state and state.values.get("messages"):
        is_action_pending = False
        for msg in reversed(state.values["messages"]):
            if isinstance(msg, ToolMessage):
                try:
                    data = json.loads(msg.content)
                    if data.get("type") == "browser_start":
                        await manager.send_event(websocket, "browser_start", {})
                        await manager.send_event(websocket, "trace_line", {
                            "taskId": task_id,
                            "line": {
                                "id": uuid.uuid4().hex[:8],
                                "timestamp": get_timestamp(),
                                "tag": "HTTP",
                                "text": f"Redirecting to https://idp.tum.de/..."
                            }
                        })
                    elif data.get("type") == "action_request":
                        await manager.send_event(websocket, "action_request", {
                            "action": data["action"]
                        })
                        is_action_pending = True
                        break
                    if "card" in data:
                        cards.append(data["card"])
                        if "login" in str(data.get("message", "")).lower() and data.get("status") == "success":
                            await manager.send_event(websocket, "login_success", {"sessionId": session_id})
                except:
                    pass
            if isinstance(msg, HumanMessage):
                break

        if not is_action_pending:
            last_message = state.values["messages"][-1]
            if isinstance(last_message, AIMessage) and last_message.content:
                await manager.send_event(websocket, "chat_message", {
                    "message": {
                        "id": uuid.uuid4().hex[:8],
                        "role": "assistant",
                        "content": last_message.content,
                        "cards": cards,
                        "timestamp": get_timestamp()
                    }
                })
    
    await manager.send_event(websocket, "task_done", {"taskId": task_id})

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            
            # Handle user submitting credentials/resolving actions
            if msg_data.get("type") == "action_resolution":
                session_id = msg_data.get("sessionId", "default-session")
                approved = msg_data.get("approved")
                user_input = msg_data.get("input")
                config = {"configurable": {"thread_id": session_id}}
                
                if approved and user_input:
                    current_state = app_graph.get_state(config)
                    user_context = current_state.values.get("user_context", {})
                    
                    if ":" in user_input and ("login" in str(msg_data.get("actionId", "")).lower() or "auth" in str(msg_data.get("actionId", "")).lower()):
                        parts = user_input.split(":", 1)
                        user_context["tum_id"] = parts[0].strip()
                        user_context["password"] = parts[1].strip()
                        content_msg = f"Credentials for {user_context['tum_id']} received. Performing Shibboleth login..."
                    else:
                        user_context["last_input"] = user_input
                        content_msg = "Information received."
                    
                    app_graph.update_state(config, {"user_context": user_context})
                    
                    await manager.send_event(websocket, "trace_line", {
                        "taskId": "auth-task",
                        "line": {
                            "id": uuid.uuid4().hex[:8],
                            "timestamp": get_timestamp(),
                            "tag": "OK",
                            "text": content_msg
                        }
                    })
                    
                    # Trigger the agent to actually perform the login now that it has credentials
                    asyncio.create_task(run_agent("Now that you have my credentials, please perform the login and confirm if it's successful.", session_id, websocket))
                continue

            content = msg_data.get("content", "")
            session_id = msg_data.get("sessionId", "default-session")
            if content:
                asyncio.create_task(run_agent(content, session_id, websocket))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS error: {e}")
        manager.disconnect(websocket)
