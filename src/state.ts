import type { PluginContext } from '@harborclient/sdk';
import {
  createExternalStore,
  createStorageStore,
  type StorageStore
} from '@harborclient/sdk/store';

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

let pluginContext: PluginContext | null = null;
let statusStore: StorageStore<EchoServerUiStatus> | null = null;
const errorStore = createExternalStore<string | null>(null);

/**
 * Parses a raw storage value into echo server UI status.
 *
 * @param raw - Raw value from plugin storage.
 */
function parseEchoStatus(raw: unknown): EchoServerUiStatus {
  if (!raw || typeof raw !== 'object') {
    return { running: false };
  }
  const candidate = raw as EchoServerUiStatus;
  if (typeof candidate.running !== 'boolean') {
    return { running: false };
  }
  return {
    running: candidate.running,
    ...(typeof candidate.port === 'number' ? { port: candidate.port } : {})
  };
}

/**
 * Returns the initialized status store or throws when echo state is unavailable.
 */
function requireStatusStore(): StorageStore<EchoServerUiStatus> {
  if (!statusStore) {
    throw new Error('Echo state is not initialized.');
  }
  return statusStore;
}

/**
 * Returns the initialized plugin context or throws when echo state is unavailable.
 */
function requirePluginContext(): PluginContext {
  if (!pluginContext) {
    throw new Error('Echo state is not initialized.');
  }
  return pluginContext;
}

/**
 * Initializes cross-webview echo state with the plugin context for this webview.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function initEchoState(hc: PluginContext): void {
  pluginContext = hc;
  statusStore = createStorageStore({
    storage: hc.storage,
    key: ECHO_STATUS_STORAGE_KEY,
    parse: parseEchoStatus,
    keepCurrentWhenMissing: true
  });
  void statusStore.reloadFromStorage();
  void refreshEchoStatusFromMain();
}

/**
 * Returns the storage-backed status store after {@link initEchoState}.
 */
export function getEchoStatusStore(): StorageStore<EchoServerUiStatus> {
  return requireStatusStore();
}

/**
 * Clears module-level echo state on plugin deactivation.
 *
 * Push onto {@link PluginContext.subscriptions} from {@link activate} so the host
 * tears down singletons when the plugin reloads or disables.
 */
export function disposeEchoState(): void {
  pluginContext = null;
  statusStore = null;
  errorStore.setState(null);
}

/**
 * Returns the latest echo server status cached in this webview.
 *
 * Tolerates pre-init reads during the first render; use {@link getEchoStatusStore}
 * when callers must fail after deactivation.
 */
export function getEchoStatus(): EchoServerUiStatus {
  return statusStore?.getSnapshot() ?? { running: false };
}

/**
 * Returns the latest inline error message for the footer panel.
 */
export function getEchoError(): string | null {
  return errorStore.getSnapshot();
}

/**
 * Subscribes to echo server UI state changes in the current webview.
 *
 * Tolerates pre-init subscription during the first render; use
 * {@link getEchoStatusStore} when callers must fail after deactivation.
 *
 * @param listener - Called when status or error state changes.
 * @returns Unsubscribe function.
 */
export function subscribeEchoState(listener: Listener): () => void {
  const unsubscribeStatus = statusStore?.subscribe(listener) ?? (() => undefined);
  const unsubscribeError = errorStore.subscribe(listener);
  return () => {
    unsubscribeStatus();
    unsubscribeError();
  };
}

/**
 * Reads persisted status from plugin storage and updates local subscribers when changed.
 */
export async function syncEchoStateFromStorage(): Promise<void> {
  await statusStore?.reloadFromStorage();
}

/**
 * Refreshes echo server status from the main plugin entry and persists it.
 */
export async function refreshEchoStatusFromMain(): Promise<void> {
  const hc = requirePluginContext();
  requireStatusStore();
  try {
    const next = await hc.ipc.invoke<EchoServerUiStatus>('status');
    await setEchoStatus(next);
  } catch {
    // Main entry may be inactive briefly during plugin reload.
  }
}

/**
 * Updates cached echo server status, persists it, and notifies local subscribers.
 *
 * @param next - New running state and optional listen port.
 */
export async function setEchoStatus(next: EchoServerUiStatus): Promise<void> {
  await requireStatusStore().set(next);
}

/**
 * Sets or clears the inline error shown in the footer panel.
 *
 * @param message - Error text, or null to clear.
 */
export function setEchoError(message: string | null): void {
  errorStore.setState(message);
}
