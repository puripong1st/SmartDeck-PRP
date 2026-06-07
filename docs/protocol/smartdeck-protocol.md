# SmartDeck Protocol

SmartDeck Protocol is the versioned JSON message model shared by the Local Web UI, Local Bridge, and Device.

## Message Envelope

```json
{
  "protocolVersion": 1,
  "id": "msg_01J00000000000000000000000",
  "type": "device.status",
  "timestamp": "2026-06-07T12:00:00.000Z",
  "source": "device",
  "target": "bridge",
  "payload": {}
}
```

## Envelope Fields

- `protocolVersion`: protocol version number. MVP starts at `1`.
- `id`: unique message ID for tracing and response correlation.
- `type`: namespaced message type.
- `timestamp`: ISO 8601 timestamp.
- `source`: `web`, `bridge`, or `device`.
- `target`: `web`, `bridge`, `device`, or `broadcast`.
- `payload`: message-specific object.

## MVP Message Groups

- `device.hello`: device announces identity and firmware capabilities.
- `device.status`: device reports connection, page, battery if available, memory, and firmware version.
- `profile.sync`: bridge sends active profile state to device.
- `page.sync`: bridge sends one device page to device.
- `button.press`: device reports button press.
- `button.release`: device reports button release.
- `action.execute`: bridge reports action execution request or result.
- `widget.update`: bridge sends widget state to device.
- `asset.sync`: bridge sends transformed device assets.
- `firmware.status`: device and bridge report firmware update readiness and progress.

## Firmware Subset

Firmware should only implement the message types needed for display, touch input, asset sync, widget updates, and firmware status. Web-only editing messages should remain between the Local Web UI and Local Bridge API.

## Versioning Rules

- New optional payload fields can be added without changing `protocolVersion`.
- Removing or changing required fields requires a new protocol version.
- Device capabilities must be declared in `device.hello`.
- Bridge must reject messages with unsupported protocol versions.

