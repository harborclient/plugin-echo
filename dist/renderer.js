// node_modules/.pnpm/@harborclient+sdk@0.4.5_react@19.2.7/node_modules/@harborclient/sdk/dist/runtime/reactHost.js
var hostReact = null;
function setHostReact(react) {
  hostReact = react;
}
function requireHostReact() {
  if (hostReact == null) {
    throw new Error(
      "Plugin React host is not installed. Call installReact(hc.react) at the start of activate()."
    );
  }
  return hostReact;
}

// node_modules/.pnpm/@harborclient+sdk@0.4.5_react@19.2.7/node_modules/@harborclient/sdk/dist/runtime/index.js
function installReact(react) {
  setHostReact(react);
}

// node_modules/.pnpm/@harborclient+sdk@0.4.5_react@19.2.7/node_modules/@harborclient/sdk/dist/runtime/react.js
function hook(name) {
  const react = requireHostReact();
  const fn = react[name];
  if (typeof fn !== "function") {
    throw new Error(`React hook "${String(name)}" is not available on hc.react.`);
  }
  return fn;
}
function useState(initialState) {
  return hook("useState")(initialState);
}
function useEffect(effect, deps) {
  return hook("useEffect")(effect, deps);
}
function useCallback(callback, deps) {
  return hook("useCallback")(callback, deps);
}

// src/state.ts
var status = { running: false };
var errorMessage = null;
var listeners = /* @__PURE__ */ new Set();
function getEchoStatus() {
  return status;
}
function getEchoError() {
  return errorMessage;
}
function subscribeEchoState(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function setEchoStatus(next) {
  status = next;
  for (const listener of listeners) {
    listener();
  }
}
function setEchoError(message) {
  errorMessage = message;
  for (const listener of listeners) {
    listener();
  }
}

// node_modules/.pnpm/@harborclient+sdk@0.4.5_react@19.2.7/node_modules/@harborclient/sdk/dist/runtime/jsx-runtime.js
var Fragment = Symbol.for("@harborclient/sdk.Fragment");
function build(type, props, key) {
  const react = requireHostReact();
  const elementType = type === Fragment ? react.Fragment : type;
  const { children, ...rest } = props ?? {};
  if (key !== void 0) {
    rest.key = key;
  }
  return react.createElement(elementType, rest, children);
}
var jsx = build;
var jsxs = build;

// src/components/EchoFooterIndicator.tsx
function EchoFooterIndicator() {
  const [status2, setStatus] = useState(getEchoStatus());
  useEffect(() => {
    return subscribeEchoState(() => {
      setStatus(getEchoStatus());
    });
  }, []);
  if (!status2.running) {
    return null;
  }
  return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center", role: "status", children: [
    /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Echo server active" }),
    /* @__PURE__ */ jsx(
      "span",
      {
        className: "inline-block h-2 w-2 rounded-full bg-success",
        "aria-hidden": "true"
      }
    )
  ] });
}

// src/components/EchoPanel.tsx
var DEFAULT_SCRIPT = "// Inspect hc.request and return a custom JSON body.\n// Return nothing to use the default httpbin-style echo.\n";
function EchoPanel({ hc }) {
  const [portInput, setPortInput] = useState("0");
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [status2, setStatus] = useState(getEchoStatus());
  const [error, setError] = useState(getEchoError());
  const [busy, setBusy] = useState(false);
  const refreshStatus = useCallback(async () => {
    try {
      const next = await hc.ipc.invoke("status");
      setEchoStatus(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    }
  }, [hc]);
  useEffect(() => {
    void refreshStatus();
    return subscribeEchoState(() => {
      setStatus(getEchoStatus());
      setError(getEchoError());
    });
  }, [refreshStatus]);
  const handleStart = useCallback(async () => {
    setBusy(true);
    setEchoError(null);
    try {
      const port = Number(portInput);
      const result = await hc.ipc.invoke("start", {
        port: Number.isFinite(port) ? port : 0,
        script
      });
      setEchoStatus(result);
      const baseUrl2 = `http://localhost:${result.port}`;
      await hc.commands.execute(
        "harborclient:setGlobalVariable",
        "echoBaseUrl",
        baseUrl2
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    } finally {
      setBusy(false);
    }
  }, [hc, portInput, script]);
  const handleStop = useCallback(async () => {
    setBusy(true);
    setEchoError(null);
    try {
      const result = await hc.ipc.invoke("stop");
      setEchoStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEchoError(message);
    } finally {
      setBusy(false);
    }
  }, [hc]);
  const baseUrl = status2.running && status2.port !== void 0 ? `http://localhost:${status2.port}` : null;
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0 flex-col bg-control", children: [
    /* @__PURE__ */ jsx("div", { className: "flex shrink-0 items-center border-b border-separator px-3 py-2 pr-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-[14px] font-medium text-text", children: "Echo server" }),
      /* @__PURE__ */ jsx(
        "span",
        {
          className: `inline-block h-2.5 w-2.5 rounded-full ${status2.running ? "bg-success" : "bg-muted"}`,
          "aria-hidden": "true"
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "text-[14px] text-muted", role: "status", children: status2.running ? `Listening on port ${status2.port}` : "Stopped" })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-auto px-3 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
      error && /* @__PURE__ */ jsx("p", { className: "text-[14px] text-danger", role: "alert", children: error }),
      baseUrl && /* @__PURE__ */ jsxs("p", { className: "text-[14px] text-text", role: "status", children: [
        "Base URL: ",
        /* @__PURE__ */ jsx("span", { className: "font-mono", children: baseUrl }),
        /* @__PURE__ */ jsx("span", { className: "text-muted", children: " (global " }),
        /* @__PURE__ */ jsx("span", { className: "font-mono text-muted", children: "{{echoBaseUrl}}" }),
        /* @__PURE__ */ jsx("span", { className: "text-muted", children: ")" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(
          "label",
          {
            htmlFor: "echo-port",
            className: "mb-1 block text-[14px] text-text",
            children: "Port"
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "echo-port",
            type: "number",
            min: 0,
            max: 65535,
            className: "w-full max-w-[12rem] rounded-md border border-separator bg-field px-2 py-1 text-[14px] text-text",
            value: portInput,
            disabled: status2.running || busy,
            onChange: (event) => setPortInput(event.target.value)
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-[14px] text-muted", children: "Use 0 for the first available non-privileged port." })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(
          "label",
          {
            htmlFor: "echo-script",
            className: "mb-1 block text-[14px] text-text",
            children: "Request script"
          }
        ),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            id: "echo-script",
            className: "min-h-[10rem] w-full rounded-md border border-separator bg-field px-2 py-2 font-mono text-[14px] text-text",
            value: script,
            disabled: busy,
            onChange: (event) => setScript(event.target.value),
            spellCheck: false
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-[14px] text-muted", children: "Runs with the same hc API as pre-request scripts. The return value becomes the response body; no return uses the default echo JSON." })
      ] }),
      /* @__PURE__ */ jsx("div", { children: status2.running ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "rounded-md border border-separator bg-control px-3 py-1 text-[14px] text-text hover:bg-selection disabled:opacity-60",
          disabled: busy,
          onClick: () => void handleStop(),
          children: "Stop"
        }
      ) : /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "rounded-md border border-separator bg-control px-3 py-1 text-[14px] text-text hover:bg-selection disabled:opacity-60",
          disabled: busy,
          onClick: () => void handleStart(),
          children: "Start"
        }
      ) })
    ] }) })
  ] });
}

// src/renderer.tsx
function activate(hc) {
  installReact(hc.react);
  function EchoPanelHost() {
    return /* @__PURE__ */ jsx(EchoPanel, { hc });
  }
  hc.subscriptions.push(
    hc.ui.registerFooterPanel({
      id: "echo.panel",
      title: "Echo server",
      Component: EchoPanelHost,
      Indicator: EchoFooterIndicator
    })
  );
}
export {
  activate
};
