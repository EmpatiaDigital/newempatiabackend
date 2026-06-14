// routes/cuotasRoutes.js

const express = require("express");
const router = express.Router();
const {
  getParametros,
  putParametros,
  getSociosConCuotas,
  getSocioDetalle,
  getCuotasBySocio,
  upsertCuota,
  enviarRecordatorio,
} = require("../controllers/cuotasController");

// ── Parámetros globales ───────────────────────────────────────────────────────
router.get("/parametros", getParametros);
router.put("/parametros", putParametros);

// ── Socios con cuotas (listado completo para superadmin/admin) ────────────────
router.get("/socios", getSociosConCuotas);

// ── Detalle completo de un socio + sus cuotas ─────────────────────────────────
// ⚠️ Debe ir ANTES de /socio/:id para que Express no capture "detalle" como :id
router.get("/socio-detalle/:id", getSocioDetalle);

// ── Cuotas de un socio específico (para rol socio) ────────────────────────────
router.get("/socio/:id", getCuotasBySocio);

// ── Crear o actualizar una cuota (upsert) ─────────────────────────────────────
router.post("/", upsertCuota);

// ── Enviar recordatorio por correo ────────────────────────────────────────────
// ⚠️ Debe ir ANTES de /socio/:id también para evitar colisión de parámetros
router.post("/recordatorio/:socioId", enviarRecordatorio);

module.exports = router;