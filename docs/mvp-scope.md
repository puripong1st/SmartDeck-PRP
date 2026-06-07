# SmartDeck Pro MVP Scope

SmartDeck Pro MVP is a local-first stream deck platform for a LAFVIN ESP32-S3 4.0-inch touchscreen device connected to a Windows PC. The first release focuses on proving the hardware control loop, local web UI, local bridge, profiles, actions, widgets, and device sync without cloud, AI, IoT, marketplace, mobile, or enterprise features.

## In Scope

- Local Web UI for profile, page, button, action, widget, asset, and settings management.
- Local Bridge for Windows capabilities that a browser cannot reliably provide.
- Local Data Store owned by the Local Bridge.
- ESP32-S3 firmware with a stable 3 by 4 touch grid and basic page navigation.
- USB Transport as the primary connection path.
- Network Transport as a secondary path for future live state and remote scenarios.
- SmartDeck Protocol as a versioned JSON message model.
- Built-in MVP Action Set:
  - launch app
  - open URL
  - keyboard shortcut
  - text injection
  - media control
  - HTTP request
- Manual Macro Builder with explicit steps and delays.
- Rule-based app detection and automatic profile switching.
- System Widgets for local state such as time, date, CPU, RAM, network speed, and active profile status.
- PNG and JPG assets.
- Manual USB Firmware Update.
- Localhost-only Local Bridge API with pairing token.
- Import/export profile packages.

## Out of Scope

- AI Command Center and AI actions.
- IoT Integration and MQTT commands.
- Cloud accounts, cloud sync, cloud backup, hosted dashboard, and marketplace backend.
- Plugin System, Plugin SDK, third-party code execution, and Marketplace.
- Mobile App.
- Enterprise Features such as fleet management, RBAC, remote deployment, and audit logs.
- OTA Update.
- GIF and SVG rendering on the device.
- Full Macro Recorder using global mouse or keyboard hooks.

## MVP Success Criteria

- A user can connect the device to Windows over USB.
- The Local Bridge can detect the device, persist profiles locally, and sync a profile to the device.
- The Local Web UI can create a profile with pages, buttons, assets, actions, and basic widgets.
- Pressing a button on the device executes the assigned action through the Local Bridge.
- App Detection Rules can switch the active profile based on foreground process or window title.
- Firmware UI remains responsive and targets at least 30 FPS during normal interaction.
- The system can be used without login, cloud deployment, or internet access.

