# SmartDeck Pro MVP Architecture

SmartDeck Pro MVP is a local-first product made of a Device, Local Bridge, Local Web UI, Local Data Store, and shared SmartDeck Protocol.

## Components

```text
Device
  ESP32-S3 firmware, touch UI, USB primary transport

Local Bridge
  Windows capability layer, local data owner, action executor, device sync

Local Web UI
  Browser-based UI packaged or served locally for editing profiles and settings

Local Data Store
  SQLite-backed persistence owned by the Local Bridge

SmartDeck Protocol
  Versioned JSON messages shared between Web UI, Bridge, and Device
```

## Runtime Flow

1. The Local Bridge starts on Windows and binds its API to `127.0.0.1`.
2. The Local Web UI pairs with the Local Bridge using a random local token.
3. The Device connects through USB Transport.
4. The Local Bridge identifies the Device and reads firmware/device status.
5. The user edits profiles, pages, buttons, actions, widgets, and assets in the Local Web UI.
6. The Local Web UI writes changes through the Local Bridge API.
7. The Local Bridge persists data in the Local Data Store and syncs supported state to the Device.
8. The Device emits button events through SmartDeck Protocol.
9. The Local Bridge executes the assigned Action and reports execution state.

## Repository Shape

```text
/
  apps/
    web/                 # Local Web UI
    bridge/              # Local Bridge
  firmware/              # ESP32-S3 PlatformIO firmware
  packages/
    protocol/            # SmartDeck Protocol schemas and shared types
    ui/                  # shared UI components, if needed
    config/              # shared tool configuration
  docs/
    adr/
    protocol/
    api/
    security/
  CONTEXT.md
```

## Ownership Boundaries

- Local Bridge owns local persistence, action execution, device sync, app detection, and Windows integration.
- Local Web UI owns user interaction and editing workflows.
- Device owns touch rendering, page display, button input, and local status presentation.
- SmartDeck Protocol owns cross-component message vocabulary.

## Data Boundary

The Local Data Store is local-first but sync-ready. Records should use stable IDs, `createdAt`, `updatedAt`, and optional `deletedAt` fields so cloud sync can be introduced later without changing core identity semantics.

## Security Boundary

The Local Bridge can launch apps, send hotkeys, inject text, read local state, and update firmware. Its API must remain localhost-only in the MVP and require Bridge Pairing for every privileged call.

