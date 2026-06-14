// routes/pagosRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Rutas para el sistema de comprobantes de pago.
// El archivo se recibe en memoria (multer.memoryStorage) y se sube a Cloudinary.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const multer  = require('multer');

const { upload } = require('../config/cloudinary');

const {
  crearPago,
  getPagosBySocio,
  listarPagos,
  getPagoById,
  aceptarPago,
  rechazarPago,
  eliminarPago,
} = require('../controllers/pagosController');

// ── Rutas públicas / del socio ────────────────────────────────────────────────

// Subir comprobante de pago (se sube a Cloudinary, optimizado 600x600 ~96kb)
router.post('/', upload.single('comprobante'), crearPago);

// Obtener todos los pagos (comprobantes) de un socio
router.get('/socio/:socioId', getPagosBySocio);

// ── Rutas de administración ───────────────────────────────────────────────────
// (Agregar middleware de auth/rol si lo tenés, ej. verifyToken + isAdmin)

// Listar todos los pagos (opcionalmente ?estado=comprobante_enviado)
router.get('/', listarPagos);

// Detalle de un pago
router.get('/:id', getPagoById);

// Aceptar comprobante → marca la cuota como pagada
router.put('/:id/aceptar', aceptarPago);

// Rechazar comprobante → el socio puede reenviar
router.put('/:id/rechazar', rechazarPago);

// Eliminar un pago (solo superadmin)
router.delete('/:id', eliminarPago);

// ── Error handler de multer ───────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ success: false, error: err.message });
  }
  return res.status(500).json({ success: false, error: 'Error al procesar el archivo' });
});

module.exports = router;