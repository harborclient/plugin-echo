/**
 * Shared echo server status between footer panel and status bar components.
 */
export interface EchoServerUiStatus {
  running: boolean;
  port?: number;
}

type Listener = () => void;

let status: EchoServerUiStatus = { running: false };
let errorMessage: string | null = null;
const listeners = new Set<Listener>();

/**
 * Returns the latest echo server status cached in the renderer bundle.
 */
export function getEchoStatus(): EchoServerUiStatus {
  return status;
}

/**
 * Returns the latest inline error message for the footer panel.
 */
export function getEchoError(): string | null {
  return errorMessage;
}

/**
 * Subscribes to echo server UI state changes.
 *
 * @param listener - Called when status or error state changes.
 * @returns Unsubscribe function.
 */
export function subscribeEchoState(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Updates cached echo server status and notifies subscribers.
 *
 * @param next - New running state and optional listen port.
 */
export function setEchoStatus(next: EchoServerUiStatus): void {
  status = next;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Sets or clears the inline error shown in the footer panel.
 *
 * @param message - Error text, or null to clear.
 */
export function setEchoError(message: string | null): void {
  errorMessage = message;
  for (const listener of listeners) {
    listener();
  }
}
