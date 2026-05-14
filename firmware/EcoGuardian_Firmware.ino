/*
 * ============================================================
 *   EcoGuardian Firmware v5.2
 *   - WiFiManager: se configura desde el teléfono, sin tocar código
 *   - NTP: timestamp Unix real
 *   - gpsValido se resetea cada ciclo
 *   - tvoc en historial
 *   - Warm-up CCS811: 3 min tras cada encendido antes de enviar datos
 *   - GPS: smartDelay + age threshold 5 s para mejor detección
 *
 *   PRIMERA VEZ:
 *     1. Enciende el ESP32
 *     2. Conéctate desde tu teléfono al hotspot "EcoGuardian-Config"
 *     3. Se abre un portal web → elige tu red WiFi e ingresa la contraseña
 *     4. El ESP32 guarda las credenciales y se conecta solo
 *     5. La próxima vez arranca directo sin el portal
 *
 *   RESETEAR WiFi guardado: conecta el pin RESET_PIN a GND 3 segundos
 * ============================================================
 */

#include <Wire.h>
#include <Adafruit_CCS811.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <WiFiManager.h>          // instalar: "WiFiManager" by tzapu

// ── Firebase ─────────────────────────────────────────────────
#define FIREBASE_URL   "https://ecoguardian-68553-default-rtdb.firebaseio.com"
// stationId y stationNombre se generan en setup() desde la MAC del ESP32

// ── Pin para resetear credenciales WiFi (opcional) ───────────
// Conecta este pin a GND al encender para olvidar la red guardada
#define RESET_PIN  0   // botón BOOT del ESP32 — ya viene en la placa

// ── NTP — UTC-7 Culiacán ──────────────────────────────────────
#define NTP_SERVER  "pool.ntp.org"
#define GMT_OFFSET  -25200
#define DST_OFFSET  0

// ── Pines ────────────────────────────────────────────────────
#define SDS_RX  16
#define SDS_TX  17
#define GPS_RX  34
#define GPS_TX  13
#define SDA_PIN 21
#define SCL_PIN 22

#define INTERVALO_ENVIO 30000

// ── Objetos ──────────────────────────────────────────────────
Adafruit_CCS811 ccs;
TinyGPSPlus     gps;
HardwareSerial  sdsSerial(2);
HardwareSerial  gpsSerial(1);

// ── Variables ────────────────────────────────────────────────
float  pm25 = 0, pm10 = 0;
float  co2  = 400, tvoc = 0;
double lat  = 24.7889, lng = -107.3975;
int    satelites = 0;
bool   gpsValido = false;
byte   buf[10];
int    bufIdx = 0;
unsigned long ultimoEnvio = 0;
bool   ntpOk = false;
String stationId;
String stationNombre;

// ── Helpers ───────────────────────────────────────────────────
String calcularNivel(float pm) {
  if (pm <= 12)  return "bueno";
  if (pm <= 35)  return "moderado";
  if (pm <= 55)  return "malo";
  if (pm <= 150) return "muy_malo";
  return "peligroso";
}

int calcularColor(float pm) {
  if (pm <= 12)  return 0;
  if (pm <= 35)  return 1;
  if (pm <= 55)  return 2;
  if (pm <= 150) return 3;
  return 4;
}

unsigned long obtenerTimestamp() {
  if (!ntpOk) return millis() / 1000;
  time_t now;  time(&now);
  return (unsigned long)now;
}

// ── Enviar a Firebase ─────────────────────────────────────────
void enviarFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;

  String nivel  = calcularNivel(pm25);
  int    color  = calcularColor(pm25);
  bool   alarma = (pm25 > 35);
  unsigned long ts = obtenerTimestamp();

  String json = "{";
  json += "\"pm25\":"       + String(pm25, 1)   + ",";
  json += "\"pm10\":"       + String(pm10, 1)   + ",";
  json += "\"co2\":"        + String(co2, 0)    + ",";
  json += "\"tvoc\":"       + String(tvoc, 0)   + ",";
  json += "\"lat\":"        + String(lat, 6)    + ",";
  json += "\"lng\":"        + String(lng, 6)    + ",";
  json += "\"satelites\":"  + String(satelites) + ",";
  json += "\"gps_valido\":" + String(gpsValido ? "true" : "false") + ",";
  json += "\"nivel\":\""    + nivel             + "\",";
  json += "\"color\":"      + String(color)     + ",";
  json += "\"alarma\":"     + String(alarma ? "true" : "false") + ",";
  json += "\"nombre\":\""   + stationNombre + "\",";
  json += "\"timestamp\":"  + String(ts);
  json += "}";

  HTTPClient http;
  http.begin(String(FIREBASE_URL) + "/estaciones/" + stationId + ".json");
  http.addHeader("Content-Type", "application/json");
  int code = http.PATCH(json);
  Serial.printf("%s Firebase PATCH (HTTP %d)\n", code == 200 ? "OK" : "ERR", code);
  http.end();

  // Historial con tvoc y timestamp real como clave
  String urlHist = String(FIREBASE_URL) + "/historial/" + stationId + "/" + String(ts) + ".json";
  String jsonHist = "{";
  jsonHist += "\"pm25\":"  + String(pm25, 1) + ",";
  jsonHist += "\"pm10\":"  + String(pm10, 1) + ",";
  jsonHist += "\"co2\":"   + String(co2, 0)  + ",";
  jsonHist += "\"tvoc\":"  + String(tvoc, 0) + ",";
  jsonHist += "\"nivel\":\"" + nivel + "\"";
  jsonHist += "}";
  http.begin(urlHist);
  http.addHeader("Content-Type", "application/json");
  http.PUT(jsonHist);
  http.end();

  if (alarma) {
    String urlAlerta = String(FIREBASE_URL) + "/alertas/" + String(ts) + ".json";
    String jsonAlerta = "{";
    jsonAlerta += "\"estacion\":\"" + stationNombre + "\",";
    jsonAlerta += "\"pm25\":"  + String(pm25, 1) + ",";
    jsonAlerta += "\"nivel\":\"" + nivel + "\",";
    jsonAlerta += "\"lat\":"   + String(lat, 6) + ",";
    jsonAlerta += "\"lng\":"   + String(lng, 6);
    jsonAlerta += "}";
    http.begin(urlAlerta);
    http.addHeader("Content-Type", "application/json");
    http.PUT(jsonAlerta);
    http.end();
    Serial.println("ALERTA enviada");
  }
}

// ── Sensores ──────────────────────────────────────────────────
void leerSDS011() {
  while (sdsSerial.available()) {
    byte b = sdsSerial.read();
    if (bufIdx == 0 && b != 0xAA) continue;
    buf[bufIdx++] = b;
    if (bufIdx == 10) {
      if (buf[9] == 0xAB) {
        float p25 = ((buf[3] << 8) | buf[2]) / 10.0;
        float p10 = ((buf[5] << 8) | buf[4]) / 10.0;
        if (p25 >= 0 && p25 < 1000) pm25 = p25;
        if (p10 >= 0 && p10 < 1000) pm10 = p10;
      }
      bufIdx = 0;
    }
  }
}

// Lee GPS continuamente durante 'ms' milisegundos para maximizar tramas NMEA procesadas
void smartDelay(unsigned long ms) {
  unsigned long inicio = millis();
  do { while (gpsSerial.available()) gps.encode(gpsSerial.read()); }
  while (millis() - inicio < ms);
}

void leerGPS() {
  while (gpsSerial.available()) gps.encode(gpsSerial.read());
  gpsValido = false;
  satelites = gps.satellites.isValid() ? gps.satellites.value() : 0;
  // Acepta fix de hasta 5 segundos de antigüedad (antes era 2 s — demasiado estricto)
  if (gps.location.isValid() && gps.location.age() < 5000) {
    lat      = gps.location.lat();
    lng      = gps.location.lng();
    gpsValido = true;
  }
}

void leerCCS811() {
  if (ccs.available() && !ccs.readData()) {
    if (ccs.geteCO2() > 0)  co2  = ccs.geteCO2();
    if (ccs.getTVOC() >= 0) tvoc = ccs.getTVOC();
  }
}

void imprimirSerial() {
  Serial.println("\n+----------------------------------+");
  Serial.printf("| PM2.5:  %.1f ug/m3  (%s)\n", pm25, calcularNivel(pm25).c_str());
  Serial.printf("| PM10:   %.1f ug/m3\n", pm10);
  Serial.printf("| eCO2:   %.0f ppm\n", co2);
  Serial.printf("| TVOC:   %.0f ppb\n", tvoc);
  if (gpsValido)
    Serial.printf("| GPS:    %.6f, %.6f (%d sats)\n", lat, lng, satelites);
  else
    Serial.printf("| GPS:    Buscando... (%d sats)\n", satelites);
  Serial.printf("| NTP:    %s\n", ntpOk ? "OK" : "Sin sync");
  Serial.println("+----------------------------------+");
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Genera ID único desde los últimos 3 bytes de la MAC
  // ESP.getEfuseMac() lee directo del hardware, disponible sin includes extra
  WiFi.mode(WIFI_STA);
  uint64_t efuseMac = ESP.getEfuseMac();
  char macHex[13];
  snprintf(macHex, sizeof(macHex), "%02x%02x%02x%02x%02x%02x",
    (uint8_t)(efuseMac),        (uint8_t)(efuseMac >> 8),
    (uint8_t)(efuseMac >> 16),  (uint8_t)(efuseMac >> 24),
    (uint8_t)(efuseMac >> 32),  (uint8_t)(efuseMac >> 40));
  String macSuffix = String(macHex).substring(6);   // últimos 3 bytes = 6 chars hex
  String macSuffixUp = macSuffix;
  macSuffixUp.toUpperCase();
  stationId     = "estacion_" + macSuffix;           // "estacion_ddeeff"
  stationNombre = "EcoG " + macSuffixUp;             // "EcoG DDEEFF"

  Serial.println("\n+==============================+");
  Serial.println("|   EcoGuardian  v5.2          |");
  Serial.println("+==============================+");
  Serial.printf( "|  ID: %-24s|\n", stationId.c_str());
  Serial.println("+==============================+\n");

  // Si el botón BOOT está presionado al encender → borra WiFi guardado
  pinMode(RESET_PIN, INPUT_PULLUP);
  if (digitalRead(RESET_PIN) == LOW) {
    Serial.println("! Borrando credenciales WiFi...");
    WiFiManager wm;
    wm.resetSettings();
    Serial.println("  Listo. Suelta el botón y reinicia.");
    delay(3000);
    ESP.restart();
  }

  // UART
  sdsSerial.begin(9600, SERIAL_8N1, SDS_RX, SDS_TX);
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("[1/4] UART OK");

  // CCS811
  Wire.begin(SDA_PIN, SCL_PIN);
  if (!ccs.begin()) {
    Serial.println("ERROR: CCS811 no encontrado");
    while (1) delay(1000);
  }
  while (!ccs.available()) delay(100);
  Serial.println("[2/4] CCS811 OK");

  // WiFi: intenta redes conocidas primero, luego abre portal si ninguna conecta
  Serial.println("[3/4] Conectando WiFi...");

  // Agrega aquí las redes conocidas antes de flashear
  const char* SSIDS[]   = {};
  const char* PASSWDS[] = {};
  const int   N_REDES   = 0;

  bool conectado = false;
  for (int i = 0; i < N_REDES && !conectado; i++) {
    Serial.printf("      Intentando: %s", SSIDS[i]);
    WiFi.begin(SSIDS[i], PASSWDS[i]);
    for (int t = 0; t < 20 && WiFi.status() != WL_CONNECTED; t++) {
      delay(500);  Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
      conectado = true;
      Serial.printf(" OK  (IP: %s)\n", WiFi.localIP().toString().c_str());
    } else {
      WiFi.disconnect();
      Serial.println(" Sin respuesta");
    }
  }

  // Si ninguna conocida conectó → portal de configuración 3 minutos
  if (!conectado) {
    Serial.println("      Abriendo portal: conectate al hotspot 'EcoGuardian-Config'");
    WiFiManager wm;
    wm.setConfigPortalTimeout(180);
    conectado = wm.autoConnect("EcoGuardian-Config");
    if (conectado)
      Serial.printf("      WiFi OK via portal (IP: %s)\n", WiFi.localIP().toString().c_str());
    else
      Serial.println("      Sin WiFi — modo solo local");
  }

  // NTP
  if (conectado) {
    Serial.print("[4/4] Sincronizando NTP...");
    configTime(GMT_OFFSET, DST_OFFSET, NTP_SERVER);
    time_t now = 0;
    unsigned long tInicio = millis();
    while (now < 1000000000UL && millis() - tInicio < 10000) {
      delay(200);
      time(&now);
    }
    ntpOk = (now > 1000000000UL);
    Serial.printf(" %s\n", ntpOk ? "OK" : "Fallo");
  } else {
    Serial.println("[4/4] NTP omitido");
  }

  // CCS811 necesita ~3 min para estabilizarse tras cada encendido.
  // Durante este tiempo se leen todos los sensores pero NO se envía a Firebase.
  Serial.println("\nCalentando CCS811 — 3 min para lecturas estables...");
  unsigned long tWarmup = millis();
  while (millis() - tWarmup < 180000) {
    leerSDS011();
    leerGPS();
    leerCCS811();
    unsigned long restantes = (180000 - (millis() - tWarmup)) / 1000;
    if (restantes % 15 == 0) {
      Serial.printf("  %lus restantes | CO2: %.0fppm  TVOC: %.0fppb  PM2.5: %.1f\n",
                    restantes, co2, tvoc, pm25);
    }
    smartDelay(1000);
  }
  Serial.println("! CCS811 estabilizado — iniciando envios a Firebase\n");
}

// ── Loop ──────────────────────────────────────────────────────
void loop() {
  leerSDS011();
  leerGPS();
  leerCCS811();
  imprimirSerial();

  if (WiFi.status() == WL_CONNECTED && millis() - ultimoEnvio > INTERVALO_ENVIO) {
    ultimoEnvio = millis();
    enviarFirebase();
  }

  smartDelay(2000);
}
