#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <SPIFFS.h>
#include <vector>

// WiFi credentials for AP mode (ESP32 as WiFi source)
const char* ap_ssid = "PowerMonitor";
const char* ap_password = "12345678";

// WiFi credentials for Station mode (ESP32 connects to existing WiFi)
const char* sta_ssid = "Your_SSID";
const char* sta_password = "Your_Password";

// Set to true to use AP mode, false for Station mode
const bool useAPMode = true;

WebServer server(80);
PZEM004Tv30 pzem(Serial2, 16, 17);  // RX, TX pins for PZEM-004T

class EnergyRoom {
private:
    String id;
    uint8_t measSSRPin;      // Pin for PZEM reading relay
    uint8_t cutoffRelayPin;  // Pin for power cutoff relay
    float currentPower = -1;
    float lastValidPower = 0;
    unsigned long lastValidRead = 0;
    bool faultFlag = false;

public:
    String name;
    float threshold;
    bool isActive;

    EnergyRoom(String id, String name, uint8_t measPin, uint8_t cutoffPin, float threshold = 2500.0)
        : id(id), name(name), measSSRPin(measPin), cutoffRelayPin(cutoffPin), 
          threshold(threshold), isActive(true) {
        
        pinMode(measSSRPin, OUTPUT);
        pinMode(cutoffRelayPin, OUTPUT);
        digitalWrite(measSSRPin, LOW);
        digitalWrite(cutoffRelayPin, LOW);  // Initially allow power flow
    }

    String getId() const { return id; }
    uint8_t getMeasPin() const { return measSSRPin; }
    uint8_t getCutoffPin() const { return cutoffRelayPin; }

    void measure() {
        digitalWrite(measSSRPin, HIGH);  // Enable PZEM reading for this room
        delay(300);  // Wait for relay and reading to stabilize
        float newPower = pzem.power();
        digitalWrite(measSSRPin, LOW);   // Disable PZEM reading

        if(!isnan(newPower)) {
            currentPower = newPower;
            lastValidPower = newPower;
            lastValidRead = millis();
            
            // Check if power exceeds threshold
            if(currentPower > threshold) {
                digitalWrite(cutoffRelayPin, HIGH);  // Cut off power
            }
        }
        
        // Check for potential bypass
        faultFlag = (digitalRead(cutoffRelayPin) == HIGH) && (lastValidPower > 10.0);
    }

    float getCurrentPower() const { return currentPower; }
    float getLastValidPower() const { return lastValidPower; }

    void updateThreshold(float newThreshold) {
        threshold = constrain(newThreshold, 100.0, 10000.0);
    }

    void resetPower() {
        digitalWrite(cutoffRelayPin, LOW);  // Restore power
        faultFlag = false;
    }

    float getDisplayPower() const { 
        return (currentPower >= 0) ? currentPower : lastValidPower; 
    }
    
    bool hasFault() const { return faultFlag; }
    bool isPowerCutoff() const { return digitalRead(cutoffRelayPin) == HIGH; }
    unsigned long getLastUpdate() const { return lastValidRead; }

    JsonObject toJson(JsonDocument& doc) {
        JsonObject obj = doc.createNestedObject();
        obj["id"] = id;
        obj["name"] = name;
        obj["display_power"] = getDisplayPower();
        obj["current_power"] = getCurrentPower();
        obj["threshold"] = threshold;
        obj["isCutoff"] = isPowerCutoff();
        obj["bypassDetected"] = hasFault();
        obj["lastActiveTime"] = getLastUpdate();
        obj["measPin"] = measSSRPin;
        obj["cutoffPin"] = cutoffRelayPin;
        return obj;
    }
};

std::vector<EnergyRoom> rooms;
unsigned long lastMeasure = 0;
String lastError;

void handleCORS() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleData() {
    handleCORS();
    if (server.method() == HTTP_OPTIONS) {
        server.send(200);
        return;
    }

    DynamicJsonDocument doc(4096);
    JsonArray array = doc.to<JsonArray>();
    
    for(auto& room : rooms) {
        room.toJson(doc);
    }
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

void handleRoomConfig() {
    handleCORS();
    if (server.method() == HTTP_OPTIONS) {
        server.send(200);
        return;
    }

    if(server.method() == HTTP_POST) {
        String postBody = server.arg("plain");
        DynamicJsonDocument doc(512);
        DeserializationError error = deserializeJson(doc, postBody);
        
        if(error) {
            lastError = "Invalid JSON";
            server.send(400, "text/plain", lastError);
            return;
        }
        
        const char* action = doc["action"];
        const char* name = doc["name"];
        
        if(strcmp(action, "add") == 0 && rooms.size() < 8) {
            String id = String(random(100000, 999999));
            uint8_t measPin = doc["measPin"] | 25;
            uint8_t cutoffPin = doc["cutoffPin"] | 26;
            float threshold = doc["threshold"] | 2500.0;
            
            rooms.emplace_back(id, name, measPin, cutoffPin, threshold);
            server.send(200, "text/plain", "Room added");
        }
        else if(strcmp(action, "remove") == 0) {
            auto it = std::remove_if(rooms.begin(), rooms.end(),
                [name](const EnergyRoom& r){ return r.name == name; });
            
            if(it != rooms.end()) {
                digitalWrite(it->getCutoffPin(), LOW);  // Ensure power is restored
                rooms.erase(it, rooms.end());
                server.send(200, "text/plain", "Room removed");
            } else {
                lastError = "Room not found";
                server.send(404, "text/plain", lastError);
            }
        }
        else if(strcmp(action, "update") == 0) {
            for(auto& room : rooms) {
                if(room.name == name) {
                    room.updateThreshold(doc["threshold"]);
                    server.send(200, "text/plain", "Threshold updated");
                    return;
                }
            }
            lastError = "Room not found";
            server.send(404, "text/plain", lastError);
        }
        else if(strcmp(action, "reconnect") == 0) {
            for(auto& room : rooms) {
                if(room.name == name) {
                    room.resetPower();
                    server.send(200, "text/plain", "Power restored");
                    return;
                }
            }
            lastError = "Room not found";
            server.send(404, "text/plain", lastError);
        }
    }
}

void setupWiFi() {
    if (useAPMode) {
        // Configure AP Mode
        WiFi.mode(WIFI_AP);
        WiFi.softAP(ap_ssid, ap_password);
        
        Serial.println("\nAP Mode Configuration:");
        Serial.print("SSID: ");
        Serial.println(ap_ssid);
        Serial.print("Password: ");
        Serial.println(ap_password);
        Serial.print("AP IP address: ");
        Serial.println(WiFi.softAPIP());
    } else {
        // Configure Station Mode
        WiFi.mode(WIFI_STA);
        WiFi.begin(sta_ssid, sta_password);
        
        // Wait for connection with timeout
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            Serial.print(".");
            attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nStation Mode Configuration:");
            Serial.print("Connected to ");
            Serial.println(sta_ssid);
            Serial.print("IP address: ");
            Serial.println(WiFi.localIP());
            
            if (MDNS.begin("esp32")) {
                Serial.println("MDNS responder started");
                MDNS.addService("http", "tcp", 80);
            }
        } else {
            Serial.println("WiFi connection failed!");
        }
    }
}

void setup() {
    Serial.begin(115200);
    
    setupWiFi();
    
    // Setup server endpoints
    server.enableCORS(true);
    server.on("/data", HTTP_GET, handleData);
    server.on("/config", HTTP_POST, handleRoomConfig);
    server.onNotFound([]() {
        handleCORS();
        if (server.method() == HTTP_OPTIONS) {
            server.send(200);
        } else {
            server.send(404, "text/plain", "Not found");
        }
    });
    
    server.begin();
    
    // Initialize default rooms
    if(rooms.empty()) {
        rooms.emplace_back("1", "Living Room", 25, 26, 2500.0);
        rooms.emplace_back("2", "Bedroom", 27, 28, 2000.0);
        rooms.emplace_back("3", "Kitchen", 29, 30, 3000.0);
    }

    Serial.println("Server started");
}

void loop() {
    server.handleClient();
    
    // Check WiFi connection and reconnect if needed
    if (!useAPMode && WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected. Reconnecting...");
        setupWiFi();
    }
    
    // Measure power for each room in rotation
    if(millis() - lastMeasure > 3000 && !rooms.empty()) {
        static size_t currentRoom = 0;
        rooms[currentRoom].measure();
        currentRoom = (currentRoom + 1) % rooms.size();
        lastMeasure = millis();
    }
}