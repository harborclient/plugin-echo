import { useCallback, useEffect, useState } from "@harborclient/sdk/react";
import type { PluginContext } from "@harborclient/sdk";
import {
  getEchoError,
  getEchoStatus,
  setEchoError,
  setEchoStatus,
  subscribeEchoState,
  type EchoServerUiStatus,
} from "../state";

interface Props {
  /**
   * Renderer plugin context for IPC and host commands.
   */
  hc: PluginContext;
}

const DEFAULT_SCRIPT =
  "// Inspect hc.request and return a custom JSON body.\n// Return nothing to use the default httpbin-style echo.\n";

/**
 * Slide-up footer panel for configuring and controlling the echo server.
 *
 * @param props - Component props.
 */
export function EchoPanel({ hc }: Props) {
  const [portInput, setPortInput] = useState("0");
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [status, setStatus] = useState<EchoServerUiStatus>(getEchoStatus());
  const [error, setError] = useState<string | null>(getEchoError());
  const [busy, setBusy] = useState(false);

  /**
   * Refreshes cached status from the main plugin entry.
   */
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const next = await hc.ipc.invoke<EchoServerUiStatus>("status");
      setEchoStatus(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    }
  }, [hc]);

  /**
   * Subscribes to shared state and loads initial server status on mount.
   */
  useEffect(() => {
    void refreshStatus();
    return subscribeEchoState(() => {
      setStatus(getEchoStatus());
      setError(getEchoError());
    });
  }, [refreshStatus]);

  /**
   * Starts the echo server with the configured port and request script.
   */
  const handleStart = useCallback(async (): Promise<void> => {
    setBusy(true);
    setEchoError(null);
    try {
      const port = Number(portInput);
      const result = await hc.ipc.invoke<EchoServerUiStatus>("start", {
        port: Number.isFinite(port) ? port : 0,
        script,
      });
      setEchoStatus(result);
      const baseUrl = `http://localhost:${result.port}`;
      await hc.commands.execute(
        "harborclient:setGlobalVariable",
        "echoBaseUrl",
        baseUrl
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    } finally {
      setBusy(false);
    }
  }, [hc, portInput, script]);

  /**
   * Stops the echo server without clearing the persisted echoBaseUrl global.
   */
  const handleStop = useCallback(async (): Promise<void> => {
    setBusy(true);
    setEchoError(null);
    try {
      const result = await hc.ipc.invoke<EchoServerUiStatus>("stop");
      setEchoStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    } finally {
      setBusy(false);
    }
  }, [hc]);

  const baseUrl =
    status.running && status.port !== undefined
      ? `http://localhost:${status.port}`
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-control">
      <div className="flex shrink-0 items-center border-b border-separator px-3 py-2 pr-8">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-text">Echo server</h3>
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status.running ? "bg-success" : "bg-muted"
            }`}
            aria-hidden="true"
          />
          <span className="text-[14px] text-muted" role="status">
            {status.running ? `Listening on port ${status.port}` : "Stopped"}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <div className="flex flex-col gap-4">
          {error && (
            <p className="text-[14px] text-danger" role="alert">
              {error}
            </p>
          )}
          {baseUrl && (
            <p className="text-[14px] text-text" role="status">
              Base URL: <span className="font-mono">{baseUrl}</span>
              <span className="text-muted"> (global </span>
              <span className="font-mono text-muted">{"{{echoBaseUrl}}"}</span>
              <span className="text-muted">)</span>
            </p>
          )}
          <div>
            <label
              htmlFor="echo-port"
              className="mb-1 block text-[14px] text-text"
            >
              Port
            </label>
            <input
              id="echo-port"
              type="number"
              min={0}
              max={65535}
              className="w-full max-w-[12rem] rounded-md border border-separator bg-field px-2 py-1 text-[14px] text-text"
              value={portInput}
              disabled={status.running || busy}
              onChange={(event) => setPortInput(event.target.value)}
            />
            <p className="mt-1 text-[14px] text-muted">
              Use 0 for the first available non-privileged port.
            </p>
          </div>
          <div>
            <label
              htmlFor="echo-script"
              className="mb-1 block text-[14px] text-text"
            >
              Request script
            </label>
            <textarea
              id="echo-script"
              className="min-h-[10rem] w-full rounded-md border border-separator bg-field px-2 py-2 font-mono text-[14px] text-text"
              value={script}
              disabled={busy}
              onChange={(event) => setScript(event.target.value)}
              spellCheck={false}
            />
            <p className="mt-1 text-[14px] text-muted">
              Runs with the same hc API as pre-request scripts. The return value
              becomes the response body; no return uses the default echo JSON.
            </p>
          </div>
          <div>
            {status.running ? (
              <button
                type="button"
                className="rounded-md border border-separator bg-control px-3 py-1 text-[14px] text-text hover:bg-selection disabled:opacity-60"
                disabled={busy}
                onClick={() => void handleStop()}
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md border border-separator bg-control px-3 py-1 text-[14px] text-text hover:bg-selection disabled:opacity-60"
                disabled={busy}
                onClick={() => void handleStart()}
              >
                Start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
