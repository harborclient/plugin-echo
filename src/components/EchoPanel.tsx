import { useCallback, useEffect, useMemo, useState } from '@harborclient/sdk/react';
import type { PluginContext } from '@harborclient/sdk';
import { copyToClipboard } from '@harborclient/sdk/clipboard';
import {
  Button,
  CodeEditor,
  CodeEditorConfigProvider,
  DEFAULT_CODE_EDITOR_CONFIG,
  FieldError,
  FormGroup,
  Input
} from '@harborclient/sdk/components';
import {
  getEchoError,
  getEchoStatus,
  setEchoError,
  setEchoStatus,
  subscribeEchoState,
  type EchoServerUiStatus
} from '../state';

interface Props {
  /**
   * Renderer plugin context for IPC and host commands.
   */
  hc: PluginContext;
}

const DEFAULT_SCRIPT =
  '// Inspect hc.request and return a custom JSON body.\n// Return nothing to use the default httpbin-style echo.\n';

const ECHO_BASE_URL_VARIABLE = '{{echoBaseUrl}}';

/**
 * Slide-up footer panel for configuring and controlling the echo server.
 *
 * @param props - Component props.
 */
export function EchoPanel({ hc }: Props) {
  const [portInput, setPortInput] = useState('0');
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [status, setStatus] = useState<EchoServerUiStatus>(getEchoStatus());
  const [error, setError] = useState<string | null>(getEchoError());
  const [busy, setBusy] = useState(false);

  /**
   * Refreshes cached status from the main plugin entry.
   */
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const next = await hc.ipc.invoke<EchoServerUiStatus>('status');
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
      const result = await hc.ipc.invoke<EchoServerUiStatus>('start', {
        port: Number.isFinite(port) ? port : 0,
        script
      });
      setEchoStatus(result);
      const baseUrl = `http://localhost:${result.port}`;
      await hc.commands.execute('harborclient:setGlobalVariable', 'echoBaseUrl', baseUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    } finally {
      setBusy(false);
    }
  }, [hc, portInput, script]);

  /**
   * Applies the current editor script to the running echo server.
   */
  const handleRefreshScript = useCallback(async (): Promise<void> => {
    setBusy(true);
    setEchoError(null);
    try {
      const result = await hc.ipc.invoke<EchoServerUiStatus>('refreshScript', { script });
      setEchoStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    } finally {
      setBusy(false);
    }
  }, [hc, script]);

  /**
   * Stops the echo server without clearing the persisted echoBaseUrl global.
   */
  const handleStop = useCallback(async (): Promise<void> => {
    setBusy(true);
    setEchoError(null);
    try {
      const result = await hc.ipc.invoke<EchoServerUiStatus>('stop');
      setEchoStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    } finally {
      setBusy(false);
    }
  }, [hc]);

  const baseUrl =
    status.running && status.port !== undefined ? `http://localhost:${status.port}` : null;

  const editorVariables = useMemo(
    () => (baseUrl ? [{ key: 'echoBaseUrl', value: baseUrl, defaultValue: '', share: false }] : []),
    [baseUrl]
  );

  /**
   * Copies the echoBaseUrl template variable to the clipboard.
   */
  const handleCopyEchoBaseUrlVariable = useCallback(async (): Promise<void> => {
    try {
      await copyToClipboard(hc, ECHO_BASE_URL_VARIABLE, {
        toast: `Copied ${ECHO_BASE_URL_VARIABLE}`
      });
    } catch {
      // Clipboard access may be unavailable in some host contexts.
    }
  }, [hc]);

  return (
    <CodeEditorConfigProvider value={DEFAULT_CODE_EDITOR_CONFIG}>
      <div className="flex h-full min-h-0 flex-col bg-control">
        <div className="flex shrink-0 items-center border-b border-separator px-3 py-2 pr-8">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-medium text-text">Echo server</h3>
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${status.running ? 'bg-success' : 'bg-muted'
                }`}
              aria-hidden="true"
            />
            <span className="text-[14px] text-muted" role="status">
              {status.running ? `Listening on port ${status.port}` : 'Stopped'}
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
          <div className="flex flex-col gap-4">
            {error && (
              <FieldError roleAlert spacing="section">
                {error}
              </FieldError>
            )}
            {baseUrl && (
              <p className="text-[14px] text-text" role="status">
                <div>Base URL: <span className="font-mono">{baseUrl}</span></div>
                {' '}
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 font-mono underline-offset-2 hover:underline"
                  style={{ color: '#32D2E2' }}
                  title="Click to copy"
                  onClick={() => void handleCopyEchoBaseUrlVariable()}
                >
                  {ECHO_BASE_URL_VARIABLE}
                </button>
              </p>
            )}
            <FormGroup
              label="Port"
              htmlFor="echo-port"
              description="Use 0 for the first available non-privileged port."
            >
              <Input
                id="echo-port"
                type="number"
                min={0}
                max={65535}
                className="max-w-[12rem]"
                value={portInput}
                disabled={status.running || busy}
                onChange={(event) => setPortInput(event.target.value)}
              />
            </FormGroup>
            <FormGroup
              label="Request script"
              htmlFor="echo-script"
              description="Runs with the same hc API as pre-request scripts. The return value becomes the response body; no return uses the default echo JSON."
            >
              <CodeEditor
                id="echo-script"
                language="javascript"
                value={script}
                onChange={setScript}
                readOnly={busy}
                minHeight="10rem"
                variables={editorVariables}
                aria-label="Request script"
              />
            </FormGroup>
            <div>
              {status.running ? (
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={busy} onClick={() => void handleStop()}>
                    Stop
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void handleRefreshScript()}
                  >
                    Refresh script
                  </Button>
                </div>
              ) : (
                <Button variant="primary" disabled={busy} onClick={() => void handleStart()}>
                  Start
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </CodeEditorConfigProvider>
  );
}
