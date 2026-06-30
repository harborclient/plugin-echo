// ../harborclient-sdk/dist/runtime-utils.js
var LOG_LEVEL_RANK = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};
function createLogger(pluginId, options) {
  const prefix = `[${pluginId}]`;
  let level = options?.level ?? "info";
  function log(messageLevel, write, ...args) {
    if (LOG_LEVEL_RANK[messageLevel] < LOG_LEVEL_RANK[level]) {
      return;
    }
    write(prefix, ...args);
  }
  const consoleLog = (...values) => {
    console.log(...values);
  };
  return {
    debug(...args) {
      log("debug", consoleLog, ...args);
    },
    info(...args) {
      log("info", consoleLog, ...args);
    },
    warn(...args) {
      const write = typeof console.warn === "function" ? (...values) => {
        console.warn(...values);
      } : consoleLog;
      log("warn", write, ...args);
    },
    error(...args) {
      const write = typeof console.error === "function" ? (...values) => {
        console.error(...values);
      } : consoleLog;
      log("error", write, ...args);
    },
    setLevel(nextLevel) {
      level = nextLevel;
    }
  };
}

// src/main.ts
var logger = createLogger("echo");
var userScript = "";
var running = false;
var listenPort;
function hasExecutableScript(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, "");
  return withoutLineComments.trim().length > 0;
}
function toScriptRequestInit(request) {
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
function activate(hc) {
  hc.subscriptions.push(
    hc.server.onRequest(async (request) => {
      const trimmed = userScript.trim();
      if (!hasExecutableScript(trimmed)) {
        return request.echo;
      }
      const context = hc.scripts.createContext({
        phase: "pre",
        request: toScriptRequestInit(request),
        variables: {}
      });
      const result = context.run(trimmed);
      if (result.error) {
        logger.error("script error:", result.error);
        return request.echo;
      }
      if (result.value === void 0 || result.value === null) {
        return request.echo;
      }
      return result.value;
    })
  );
  hc.subscriptions.push(
    hc.ipc.handle("start", async (...args) => {
      const payload = args[0] ?? {};
      userScript = String(payload.script ?? "");
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
    hc.ipc.handle("stop", async () => {
      await hc.server.stop();
      running = false;
      listenPort = void 0;
      return { running: false };
    })
  );
  hc.subscriptions.push(
    hc.ipc.handle("refreshScript", async (...args) => {
      if (!running) {
        throw new Error("Echo server is not running");
      }
      const payload = args[0] ?? {};
      userScript = String(payload.script ?? "");
      return { running: true, port: listenPort };
    })
  );
  hc.subscriptions.push(
    hc.ipc.handle("status", async () => ({
      running,
      port: listenPort
    }))
  );
}
async function deactivate(hc) {
  if (running) {
    await hc.server.stop();
    running = false;
    listenPort = void 0;
  }
}
export {
  activate,
  deactivate
};
