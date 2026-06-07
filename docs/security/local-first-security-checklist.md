# Local-first Security Checklist

## Local Bridge API

- Bind API to `127.0.0.1` only.
- Require Bridge Pairing token on all privileged requests.
- Reject requests from unapproved origins.
- Do not expose LAN or remote API access in MVP.
- Regenerate and revoke pairing tokens from the Local Web UI.
- Use explicit allowlists for action types.

## Action Execution

- Validate every action payload before execution.
- Do not execute arbitrary shell strings from profiles.
- Launch apps using structured executable path plus arguments.
- Restrict text injection and hotkeys to explicit configured actions.
- Log action execution result locally.
- Show clear failure state for blocked or invalid actions.

## Assets

- Validate uploaded file type and size.
- Decode and transform assets before sending to device.
- Store source assets separately from Device Assets.
- Use fallback icons when transformed assets fail.

## Device and Firmware

- Validate SmartDeck Protocol version.
- Reject malformed protocol messages.
- Keep manual USB Firmware Update recoverable.
- Do not enable OTA Update in MVP.
- Surface firmware version and device identity in the Local Web UI.

## Data

- Store Local Data Store files in an app-owned location.
- Use stable IDs and timestamps.
- Keep secrets separate from ordinary profile data.
- Do not require cloud login for MVP.
- Support export/import without embedding local pairing tokens.

