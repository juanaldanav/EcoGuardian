// ============================================================
//   functions/index.js — EcoGuardian Cloud Functions
//   Notificación SMTP cuando el firmware escribe una alerta.
//
//   CREDENCIALES: nunca aquí. Se inyectan con:
//     firebase functions:secrets:set SMTP_HOST
//     firebase functions:secrets:set SMTP_PORT
//     firebase functions:secrets:set SMTP_USER
//     firebase functions:secrets:set SMTP_PASS
//     firebase functions:secrets:set SMTP_FROM
//     firebase functions:secrets:set ALERT_TO
// ============================================================
"use strict";

const { onValueCreated } = require("firebase-functions/v2/database");
const { defineSecret }   = require("firebase-functions/params");
const admin              = require("firebase-admin");
const nodemailer         = require("nodemailer");

admin.initializeApp();

// Secrets — resueltos en tiempo de ejecución, nunca en código
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_FROM = defineSecret("SMTP_FROM");
const ALERT_TO  = defineSecret("ALERT_TO");   // destinatario(s) separados por coma

// ── Trigger: nueva alerta en /alertas/{alertId} ───────────────
exports.onAlertaCreada = onValueCreated(
  {
    ref:     "/alertas/{alertId}",
    region:  "us-central1",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ALERT_TO],
  },
  async (event) => {
    const alerta   = event.data.val();
    const alertId  = event.params.alertId;

    if (!alerta) return null;

    const {
      estacionId = "desconocida",
      estacion   = estacionId,
      pm25       = "--",
      pm10       = "--",
      co2        = "--",
      ts         = Date.now(),
    } = alerta;

    const fecha = new Date(typeof ts === "number" ? ts * 1000 : ts)
      .toLocaleString("es-MX", { timeZone: "America/Monterrey" });

    const transporter = nodemailer.createTransport({
      host:   SMTP_HOST.value(),
      port:   parseInt(SMTP_PORT.value(), 10),
      secure: parseInt(SMTP_PORT.value(), 10) === 465,
      auth: {
        user: SMTP_USER.value(),
        pass: SMTP_PASS.value(),
      },
    });

    const html = `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto">
        <div style="background:#2E7D32;padding:24px 28px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">⚠️ Alerta de Calidad del Aire</h1>
          <p style="color:#A5D6A7;margin:6px 0 0;font-size:13px">EcoGuardian · NATURALEZA · IOT</p>
        </div>
        <div style="background:#F9FBF9;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #E0E8E0">
          <p style="margin:0 0 16px;font-size:15px;color:#1C2B1E">
            La estación <strong>${estacion}</strong> registró niveles que superan el umbral de alerta.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr style="background:#E8F5E9">
              <td style="padding:10px 14px;font-weight:600;color:#2E7D32">PM2.5</td>
              <td style="padding:10px 14px;color:#1C2B1E">${pm25} µg/m³</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:600;color:#388E3C">PM10</td>
              <td style="padding:10px 14px;color:#1C2B1E">${pm10} µg/m³</td>
            </tr>
            <tr style="background:#E8F5E9">
              <td style="padding:10px 14px;font-weight:600;color:#388E3C">CO₂</td>
              <td style="padding:10px 14px;color:#1C2B1E">${co2} ppm</td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#6B7A6E">
            Fecha: ${fecha} · ID alerta: ${alertId}
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#9EB09E">
            Criterios NOM-172-SEMARNAT-2023. Este correo es automático, no responder.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from:    `"EcoGuardian Alertas" <${SMTP_FROM.value()}>`,
      to:      ALERT_TO.value(),
      subject: `⚠️ Alerta AQI — ${estacion} · ${pm25} µg/m³`,
      html,
    });

    console.log(`Alerta ${alertId} notificada por correo.`);
    return null;
  }
);
