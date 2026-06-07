#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <lvgl.h>
#include <TFT_eSPI.h>

// Wi-Fi details
const char *ssid = "true_home2G_0df";
const char *password = "8dwzuaaw";

// Local Bridge IP and Port
const char *bridge_ip = "192.168.2.37"; // Update with actual local PC IP// Update with actual local PC IP
const int bridge_port = 5001;

WebSocketsClient webSocket;

// Screen size
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 480

TFT_eSPI tft = TFT_eSPI(SCREEN_WIDTH, SCREEN_HEIGHT);

// Touch screen configuration (using simulated callbacks for LVGL driver interface)
void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
    uint32_t w = (area->x2 - area->x1 + 1);
    uint32_t h = (area->y2 - area->y1 + 1);

    tft.startWrite();
    tft.setAddrWindow(area->x1, area->y1, w, h);
    tft.pushColors((uint16_t *)px_map, w * h, true);
    tft.endWrite();

    lv_display_flush_ready(disp);
}

void my_touchpad_read(lv_indev_t *indev, lv_indev_data_t *data) {
    uint16_t touchX = 0, touchY = 0;
    bool touched = false; // Mock capacitive touch reading

    if (!touched) {
        data->state = LV_INDEV_STATE_RELEASED;
    } else {
        data->state = LV_INDEV_STATE_PRESSED;
        data->point.x = touchX;
        data->point.y = touchY;
    }
}

// SmartDeck layout variables
struct DeckButton {
    String id;
    String label;
    lv_obj_t* btn_obj;
    lv_obj_t* label_obj;
    int row;
    int col;
};

DeckButton deckButtons[12]; // 3x4 layout grid
String activeProfileId = "";
String activePageId = "";

void sendButtonEvent(const String& eventType, const String& buttonId, int row, int col) {
    JsonDocument doc;
    doc["protocolVersion"] = 1;
    doc["id"] = "dev_" + String(millis());
    doc["type"] = eventType;
    doc["timestamp"] = "2026-06-07T12:00:00.000Z"; // Simulated timestamp
    doc["source"] = "device";
    doc["target"] = "bridge";

    JsonObject payload = doc["payload"].to<JsonObject>();
    payload["buttonId"] = buttonId;
    payload["rowIdx"] = row;
    payload["colIdx"] = col;

    String jsonString;
    serializeJson(doc, jsonString);
    webSocket.sendTXT(jsonString);
}

static void btn_event_cb(lv_event_t * e) {
    lv_event_code_t code = lv_event_get_code(e);
    DeckButton* btn = (DeckButton*)lv_event_get_user_data(e);

    if (code == LV_EVENT_PRESSED) {
        Serial.printf("Pressed button: %s at %d,%d\n", btn->label.c_str(), btn->row, btn->col);
        sendButtonEvent("button.press", btn->id, btn->row, btn->col);
    } else if (code == LV_EVENT_RELEASED) {
        Serial.printf("Released button: %s\n", btn->label.c_str());
        sendButtonEvent("button.release", btn->id, btn->row, btn->col);
    }
}

void setupUI() {
    lv_obj_t *scr = lv_screen_active();
    lv_obj_clean(scr);

    // Create 3x4 grid using LVGL
    int btn_w = 70;
    int btn_h = 70;
    int gap = 8;
    int start_x = 10;
    int start_y = 40;

    // Header label
    lv_obj_t *header = lv_label_create(scr);
    lv_label_set_text(header, "SmartDeck Pro ESP32");
    lv_obj_align(header, LV_ALIGN_TOP_MID, 0, 10);

    for (int r = 0; r < 3; r++) {
        for (int c = 0; c < 4; c++) {
            int idx = r * 4 + c;
            DeckButton& db = deckButtons[idx];
            db.row = r;
            db.col = c;
            db.id = "btn_" + String(r) + "_" + String(c);
            db.label = "";

            db.btn_obj = lv_button_create(scr);
            lv_obj_set_size(db.btn_obj, btn_w, btn_h);
            lv_obj_set_pos(db.btn_obj, start_x + c * (btn_w + gap), start_y + r * (btn_h + gap));
            lv_obj_add_event_cb(db.btn_obj, btn_event_cb, LV_EVENT_ALL, &db);

            db.label_obj = lv_label_create(db.btn_obj);
            lv_label_set_text(db.label_obj, "");
            lv_obj_center(db.label_obj);
        }
    }
}

void parseProfileSync(const JsonObject& payload) {
    JsonObject activeProfile = payload["activeProfile"];
    activeProfileId = activeProfile["id"].as<String>();
    
    JsonArray pages = activeProfile["pages"];
    if (pages.size() > 0) {
        JsonObject firstPage = pages[0];
        activePageId = firstPage["id"].as<String>();
        JsonArray buttons = firstPage["buttons"];

        for (JsonObject btn : buttons) {
            int r = btn["rowIdx"];
            int c = btn["colIdx"];
            int idx = r * 4 + c;
            if (idx >= 0 && idx < 12) {
                deckButtons[idx].id = btn["id"].as<String>();
                deckButtons[idx].label = btn["label"].as<String>();
                if (deckButtons[idx].label_obj) {
                    lv_label_set_text(deckButtons[idx].label_obj, deckButtons[idx].label.c_str());
                }
            }
        }
    }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("[WS] Disconnected!");
            break;
        case WStype_CONNECTED:
            Serial.printf("[WS] Connected to URL: %s\n", payload);
            // Announce device status
            {
                JsonDocument doc;
                doc["protocolVersion"] = 1;
                doc["id"] = "dev_hello";
                doc["type"] = "device.hello";
                doc["timestamp"] = "2026-06-07T12:00:00.000Z";
                doc["source"] = "device";
                doc["target"] = "bridge";

                JsonObject p = doc["payload"].to<JsonObject>();
                p["deviceId"] = "esp32_s3_hardware_v1";
                p["firmwareVersion"] = "1.0.0";
                p["hardwareModel"] = "ESP32-S3 LAFVIN 4.0";
                p["gridRows"] = 3;
                p["gridCols"] = 4;

                String out;
                serializeJson(doc, out);
                webSocket.sendTXT(out);
            }
            break;
        case WStype_TEXT:
            Serial.printf("[WS] Received text: %s\n", payload);
            {
                JsonDocument doc;
                DeserializationError error = deserializeJson(doc, payload);
                if (!error) {
                    String type = doc["type"].as<String>();
                    if (type == "profile.sync") {
                        parseProfileSync(doc["payload"].as<JsonObject>());
                    }
                }
            }
            break;
        case WStype_BIN:
            break;
    }
}

void setup() {
    Serial.begin(115200);

    tft.begin();
    tft.setRotation(1);

    lv_init();
    
    static uint16_t buf[SCREEN_WIDTH * 10];
    lv_display_t * disp = lv_display_create(SCREEN_WIDTH, SCREEN_HEIGHT);
    lv_display_set_buffers(disp, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
    lv_display_set_flush_cb(disp, my_disp_flush);

    lv_indev_t * indev = lv_indev_create();
    lv_indev_set_type(indev, LV_INDEV_TYPE_POINTER);
    lv_indev_set_read_cb(indev, my_touchpad_read);

    setupUI();

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected!");

    webSocket.begin(bridge_ip, bridge_port, "/events");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(3000);
}

void loop() {
    lv_timer_handler();
    webSocket.loop();
    delay(5);
}
