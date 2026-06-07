# SmartDeck Pro

SmartDeck Pro is a stream deck platform for controlling productivity, streaming, IoT, and automation workflows from a touchscreen hardware device.

## Language

**SmartDeck Pro**:
The product platform that combines a touchscreen hardware device, a web app, and a local bridge for user-configurable command control.
_Avoid_: SmartDeck, Stream Deck clone

**Web App**:
The primary user interface for configuring devices, profiles, buttons, workflows, marketplace assets, and cloud-connected features.
_Avoid_: Desktop app, admin panel

**Local Bridge**:
A lightweight Windows-side capability layer that gives the web app controlled access to local operating system features that browsers cannot reliably provide. It is not the main application backend.
_Avoid_: Desktop app, full desktop client, background hack

**Device**:
The ESP32-S3 touchscreen hardware unit used by the user to trigger actions and view live controls.
_Avoid_: Board, screen, controller

**USB Transport**:
The primary connection path between the device and the local computer for low-latency commands, device management, and direct interaction.
_Avoid_: Cable mode, serial mode

**Network Transport**:
The secondary connection path between the device and the system for live widgets, remote state, cloud-related updates, and future remote configuration.
_Avoid_: WiFi mode, online mode

**Local-first MVP**:
The first product version that works primarily on the user's local computer and device without requiring cloud accounts, cloud sync, or marketplace infrastructure.
_Avoid_: Offline mode, prototype

**Local Data Store**:
The local persistence owned by the local bridge for profiles, actions, device state, and sync-ready records used by the web app.
_Avoid_: Browser storage, app cache

**Profile**:
A named control setup for a specific usage context, containing pages, buttons, and their assigned actions.
_Avoid_: Workspace, preset

**Button**:
A visual control placed on a device page or in the editor that the user presses to trigger an assigned action.
_Avoid_: Action, tile, shortcut

**Action**:
The operation executed when a button is triggered, such as launching an app, opening a URL, sending a shortcut, injecting text, controlling media, or making an HTTP request.
_Avoid_: Button, command, macro

**MVP Action Set**:
The initial group of supported actions for the local-first MVP: launch app, open URL, keyboard shortcut, text injection, media control, and HTTP request.
_Avoid_: Full action catalog, plugin actions

**Device Page**:
A single screen of buttons shown on the device within a profile.
_Avoid_: Screen, folder, view

**Default Device Grid**:
The initial 3 by 4 button layout used by the MVP device page.
_Avoid_: Custom grid, dynamic layout

**App Detection Rule**:
A local rule that matches the active Windows process or window title and selects the profile that should become active.
_Avoid_: Automation rule, AI detection

**Fallback Profile**:
The profile used when no app detection rule matches the current foreground application.
_Avoid_: Default settings, empty profile

**Macro**:
A multi-step action assembled by the user from supported action steps and delays.
_Avoid_: Script, recording

**Macro Builder**:
The user interface for manually assembling a macro from explicit steps.
_Avoid_: Macro recorder, workflow builder

**Macro Recorder**:
A future capability that records real mouse or keyboard input from the operating system for playback.
_Avoid_: Macro builder

**Action Registry**:
The internal catalog of built-in action types supported by the product.
_Avoid_: Plugin marketplace, extension store

**Plugin**:
A future third-party extension that adds actions, widgets, integrations, or themes beyond the built-in product capabilities.
_Avoid_: Built-in action

**Marketplace**:
A future distribution channel for profiles, plugins, widgets, themes, and icon packs.
_Avoid_: Action registry, asset folder

**Widget**:
A visual element that displays live data or current state on the device or in the editor.
_Avoid_: Button, action

**System Widget**:
A widget backed by local computer or device state.
_Avoid_: Internet widget, integration widget

**External Widget**:
A future widget backed by an external service or third-party API.
_Avoid_: System widget

**Firmware UI**:
The touch interface rendered on the device for buttons, widgets, status, and page navigation.
_Avoid_: Web app UI, dashboard UI

**Performance Target**:
The minimum interaction smoothness the firmware UI must meet for the MVP to feel usable.
_Avoid_: Stretch goal, visual ambition

**Visual Ambition**:
A higher-fidelity visual treatment planned after the device interaction loop is stable.
_Avoid_: Performance target

**AI Command Center**:
A future product area for AI-assisted commands and provider integrations that is outside the MVP scope.
_Avoid_: MVP action, core action

**IoT Integration**:
A future product area for controlling smart devices and automation systems that is outside the MVP scope.
_Avoid_: MVP action, HTTP request action

**MQTT Command**:
A future action type for publishing MQTT messages that is outside the MVP scope.
_Avoid_: HTTP request action

**Local User**:
The person using SmartDeck Pro on the local computer without creating or signing into a cloud account.
_Avoid_: Account, tenant, workspace user

**Cloud Account**:
A future user identity for cloud sync, marketplace participation, team features, and enterprise administration.
_Avoid_: Local user

**Local Bridge API**:
The localhost-only API exposed by the local bridge for the web app to access local capabilities.
_Avoid_: Public API, cloud API

**Bridge Pairing**:
The local trust setup that allows the web app to call the local bridge API using a random token.
_Avoid_: Login, OAuth

**Local Web UI**:
The web app experience packaged or served locally with the local bridge for the MVP.
_Avoid_: Hosted app, cloud dashboard

**Hosted Web App**:
A future cloud-hosted version of the web app for account-based sync, marketplace, and remote access.
_Avoid_: Local web UI

**Firmware Update**:
The process of installing new firmware on the device, initially through a manual USB flow.
_Avoid_: OTA update

**OTA Update**:
A future firmware update flow delivered over the network.
_Avoid_: Manual firmware update

**Asset**:
An image or media file used to represent a button, profile, theme, or future marketplace item.
_Avoid_: Plugin, action

**Device Asset**:
An asset transformed for display on the device.
_Avoid_: Source asset

**Mobile App**:
A future companion app for configuration, notifications, uploads, or remote control that is outside the MVP scope.
_Avoid_: Local web UI

**Enterprise Features**:
Future organization-level capabilities such as fleet management, team workspaces, role-based access control, audit logs, and remote deployment.
_Avoid_: Local device status

**MVP Deliverables**:
The first release artifact set focused on product scope, architecture, local-first data, firmware, local bridge, local web UI, protocol docs, local API docs, asset pipeline, testing, security, and local deployment.
_Avoid_: Full platform deliverables

**Product Monorepo**:
The repository shape that keeps the local web UI, local bridge, firmware, shared protocol package, and documentation together for the MVP.
_Avoid_: Multi-repo setup

**SmartDeck Protocol**:
The versioned JSON message model shared by the local web UI, local bridge, and device for device status, profile sync, button events, actions, widgets, assets, and firmware state.
_Avoid_: Ad hoc messages, bridge API
