import type { AgentAdapter, AgentEvent } from "./types";

class WebSocketAdapter implements AgentAdapter {
  private socket: WebSocket | null = null;
  private onEventCallback: ((event: AgentEvent) => void) | null = null;

  private connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve(this.socket);
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = "localhost:8000"; // Assuming backend is on port 8000
      this.socket = new WebSocket(`${protocol}//${host}/ws/chat`);

      this.socket.onopen = () => {
        console.log("WebSocket connected");
        resolve(this.socket!);
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (this.onEventCallback) {
          if (data.type === "browser_start" || data.type === "browser_retry" || data.type === "login_success") {
            this.onEventCallback(data);
          } else {
            this.onEventCallback(data as AgentEvent);
          }
        }
      };

      this.socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        reject(err);
      };

      this.socket.onclose = () => {
        console.log("WebSocket disconnected");
        this.socket = null;
      };
    });
  }

  async sendMessage(
    sessionId: string,
    userMessage: string,
    onEvent: (event: AgentEvent) => void
  ): Promise<void> {
    this.onEventCallback = onEvent;
    const socket = await this.connect();
    socket.send(JSON.stringify({ sessionId, content: userMessage }));
  }

  resolveAction(sessionId: string, actionId: string, approved: boolean, input?: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "action_resolution",
        sessionId,
        actionId,
        approved,
        input
      }));
    }
  }
}

export const httpAdapter = new WebSocketAdapter();
