# Firmware

This directory will contain the ESP32-S3 firmware for the LAFVIN 4.0-inch 320x480 capacitive touch display.

Planned stack:

- PlatformIO
- Arduino Framework
- LVGL 9
- TFT_eSPI
- ArduinoJson
- TinyUSB
- LittleFS

MVP responsibilities:

- Render Firmware UI with the Default Device Grid
- Handle touch input and swipe page navigation
- Send button events through SmartDeck Protocol
- Receive profile, page, widget, and asset sync messages
- Report device and firmware status
- Support manual USB Firmware Update flow

