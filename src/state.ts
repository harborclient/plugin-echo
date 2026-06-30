import type { PluginContext } from '@harborclient/sdk';

/** Storage key for echo server status shared across plugin webviews. */
export const ECHO_STATUS_STORAGE_KEY = 'echo-status';

/**
 * Shared echo server status between footer panel and indicator webviews.
 */
export interface EchoServerUiStatus {
  running: boolean;
  port?: number;
}

type Listener = () => void;

const SYNC_INTERVAL_MS = 500;

let pluginContext: PluginContext | null = null;
let status: EchoServerUiStatus = { running: false };
let errorMessage: string | null = null;
let lastStatusJson = JSON.stringify(status);
const listeners = new Set<Listener>();

/**
 * Notifies all in-webview subscribers after state changes.
 */
function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Applies a status snapshot when it differs from the cached value.
 *
 * @param next - New running state and optional listen port.
 */
function applyStatus(next: EchoServerUiStatus): void {
  const nextJson = JSON.stringify(next);
  if (nextJson === lastStatusJson) {
    return;
  }
  lastStatusJson = nextJson;
  status = next;
  notifyListeners();
}

/**
 * Initializes cross-webview echo state with the plugin context for this webview.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function initEchoState(hc: PluginContext): void {
  pluginContext = hc;
  void syncEchoStateFromStorage();
  void refreshEchoStatusFromMain();
}

/**
 * Returns the latest echo server status cached in this webview.
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
 * Subscribes to echo server UI state changes in the current webview.
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
 * Reads persisted status from plugin storage and updates local subscribers when changed.
 */
export async function syncEchoStateFromStorage(): Promise<void> {
  if (!pluginContext) {
    return;
  }
  const stored = await pluginContext.storage.get<EchoServerUiStatus>(ECHO_STATUS_STORAGE_KEY);
  if (stored) {
    applyStatus(stored);
  }
}

/**
 * Refreshes echo server status from the main plugin entry and persists it.
 */
export async function refreshEchoStatusFromMain(): Promise<void> {
  if (!pluginContext) {
    return;
  }
  try {
    const next = await pluginContext.ipc.invoke<EchoServerUiStatus>('status');
    setEchoStatus(next);
  } catch {
    // Main entry may be inactive briefly during plugin reload.
  }
}

/**
 * Polls plugin storage so indicator and panel webviews stay in sync.
 *
 * @returns Cleanup function that stops polling.
 */
export function startEchoStateSync(): () => void {
  const interval = setInterval(() => {
    void syncEchoStateFromStorage();
  }, SYNC_INTERVAL_MS);
  return () => {
    clearInterval(interval);
  };
}

/**
 * Updates cached echo server status, persists it, and notifies local subscribers.
 *
 * @param next - New running state and optional listen port.
 */
export function setEchoStatus(next: EchoServerUiStatus): void {
  applyStatus(next);
  void pluginContext?.storage.set(ECHO_STATUS_STORAGE_KEY, next);
}

/**
 * Sets or clears the inline error shown in the footer panel.
 *
 * @param message - Error text, or null to clear.
 */
export function setEchoError(message: string | null): void {
  errorMessage = message;
  notifyListeners();
}
