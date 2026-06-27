# Echo Server

HarborClient plugin that runs a local httpbin-style HTTP echo server inside the app.

## Features

- Footer panel **Echo server** with port configuration, start/stop controls, and a request script editor
- Status indicator in the footer bar showing whether the server is active
- Optional request script using the same `hc` API as collection pre-request scripts
- Sets the global variable `echoBaseUrl` (for example `http://localhost:4335`) when the server starts

## Permissions

- `ui` — footer panel, status bar item, and host global variable command
- `ipc` — renderer ↔ main coordination for start/stop/status
- `server` — local express echo server in the Electron main process

## Development

```bash
pnpm install
pnpm build
```

Load the unpacked plugin directory from HarborClient **Settings → Plugins → Load unpacked**.

## Request script

When the script returns a value, that JSON is sent as the response body. When it returns nothing (or is empty), the server responds with the default echo payload:

- `args`, `data`, `files`, `form`, `headers`, `json`, `origin`, `url`

Example:

```javascript
hc.request.method;
// return custom body:
({ message: "hello", method: hc.request.method });
```
