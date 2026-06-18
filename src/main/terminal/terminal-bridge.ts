export interface TerminalBridge {
  attachToTask(input: { taskId: string; terminalSessionId: string }): Promise<void>;
  disposeSession(terminalSessionId: string): Promise<void>;
  openSession(input: { taskId: string; title: string }): Promise<{ terminalSessionId: string }>;
}

export const createStubTerminalBridge = (): TerminalBridge => ({
  async attachToTask() {},
  async disposeSession() {},
  async openSession(input) {
    return {
      terminalSessionId: `stub-${input.taskId}`,
    };
  },
});
