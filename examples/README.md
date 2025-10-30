# Examples

This folder contains example scaffolds to use the SWAP protocol library.

## WebRTC Demo (browser)

Folder: `webrtc-demo/`

This is a simple scaffold showing how to use `SwapClient` and `SwapWebRTCHelper` in the browser. It assumes a SWAP server is reachable at `ws://localhost:8080/3gpp-swap/v1`.

Steps:

- Start the server locally: `npm start`
- Serve the `webrtc-demo` folder over HTTP (e.g., `npx http-server examples/webrtc-demo -p 8081`)
- Open two browser tabs to the demo and follow on-screen instructions.

Notes:

- This scaffold is illustrative. In production, bundle `swap-protocol` via a bundler (Vite, Webpack) or expose the library as an ES module in your app.

