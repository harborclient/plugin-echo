import type { EchoServerIncomingRequest, MainPluginContext } from '@harborclient/sdk/main';
import { createLogger } from '@harborclient/sdk/runtime-utils';

const logger = createLogger('echo');

let userScript = '';
let running = false;
let listenPort: number | undefined;

/**
 * Returns whether a script source contains executable code after stripping comments.
 *
 * @param source - User-authored request script.
 */
function hasExecutableScript(source: string): boolean {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, '');
  return withoutLineComments.trim().length > 0;
}

/**
 * Maps an incoming echo request to hc.scripts request init shape.
 *
 * @param request - Serializable HTTP snapshot from the host echo server.
 */
function toScriptRequestInit(request: EchoServerIncomingRequest) {
  return {
    method: request.method,
    url: request.url,
    headers: Object.entries(request.headers).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true
    })),
    params: request.params,
    body: request.body,
    bodyType: request.bodyType
  };
}

/**
 * Activates the main-process half: echo server and renderer IPC bridge.
 *
 * @param hc - Main plugin context from the HarborClient host.
 */
export function activate(hc: MainPluginContext): void {
  hc.subscriptions.push(
    hc.server.onRequest(async (request: EchoServerIncomingRequest) => {
      const trimmed = userScript.trim();
      if (!hasExecutableScript(trimmed)) {
        return request.echo;
      }

      const context = hc.scripts.createContext({
        phase: 'pre',
        request: toScriptRequestInit(request),
        variables: {}
      });

      const result = context.run(trimmed);
      if (result.error) {
        logger.error('script error:', result.error);
        return request.echo;
      }

      if (result.value === undefined || result.value === null) {
        return request.echo;
      }

      return result.value;
    })
  );

  hc.subscriptions.push(
    hc.ipc.handle('start', async (...args: unknown[]) => {
      const payload = (args[0] ?? {}) as { port?: number; script?: string };
      userScript = String(payload.script ?? '');
      const port = Number(payload.port ?? 0);
      const result = await hc.server.start({
        port: Number.isFinite(port) ? port : 0
      });
      running = true;
      listenPort = result.port;
      return { running: true, port: result.port };
    })
  );

  hc.subscriptions.push(
    hc.ipc.handle('stop', async () => {
      await hc.server.stop();
      running = false;
      listenPort = undefined;
      return { running: false };
    })
  );

  hc.subscriptions.push(
    hc.ipc.handle('refreshScript', async (...args: unknown[]) => {
      if (!running) {
        throw new Error('Echo server is not running');
      }
      const payload = (args[0] ?? {}) as { script?: string };
      userScript = String(payload.script ?? '');
      return { running: true, port: listenPort };
    })
  );

  hc.subscriptions.push(
    hc.ipc.handle('status', async () => ({
      running,
      port: listenPort
    }))
  );
}

/**
 * Stops the echo server when the plugin main entry deactivates.
 *
 * @param hc - Main plugin context from the HarborClient host.
 */
export async function deactivate(hc: MainPluginContext): Promise<void> {
  if (running) {
    await hc.server.stop();
    running = false;
    listenPort = undefined;
  }
}
