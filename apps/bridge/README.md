# Local Bridge

This app will contain the SmartDeck Pro Local Bridge.

Planned stack:

- Tauri 2
- Rust
- SQLite
- Local HTTP and WebSocket API

Primary responsibilities:

- Own the Local Data Store
- Expose the localhost-only Local Bridge API
- Pair with the Local Web UI
- Detect and sync the Device
- Execute built-in actions
- Run App Detection Rules
- Provide System Widget data
- Handle manual USB Firmware Update

