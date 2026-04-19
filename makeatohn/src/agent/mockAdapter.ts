import type { AgentAdapter, AgentEvent } from "./types";
import { runStudyRoomMoodleScenario } from "./scenarios/studyRoomMoodle";
import { runTranscriptDownloadScenario } from "./scenarios/transcriptDownload";

type Resolver = (approved: boolean) => void;

class MockAdapter implements AgentAdapter {
  private pendingResolvers: Map<string, Resolver> = new Map();

  async sendMessage(
    _sessionId: string,
    userMessage: string,
    onEvent: (event: AgentEvent) => void
  ): Promise<void> {
    const waitForAction = (actionId: string): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        this.pendingResolvers.set(actionId, resolve);
      });
    };

    if (userMessage.toLowerCase().includes("transcript")) {
      await runTranscriptDownloadScenario(onEvent, waitForAction);
    } else {
      await runStudyRoomMoodleScenario(onEvent, waitForAction);
    }
  }

  resolveAction(_sessionId: string, actionId: string, approved: boolean): void {
    const resolver = this.pendingResolvers.get(actionId);
    if (resolver) {
      this.pendingResolvers.delete(actionId);
      resolver(approved);
    }
  }
}

export const mockAdapter = new MockAdapter();
