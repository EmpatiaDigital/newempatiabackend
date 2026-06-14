// routes/tusCursosRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tusCursosController');

// GET  /api/tuscursos/:socioId          → listado de cursos + estado de pago
// POST /api/tuscursos/:socioId/pago     → subir comprobante (multipart)
// POST /api/tuscursos/:socioId/cancelar → cancelar inscripción

router.get('/:socioId', ctrl.getMisCursos);

router.post(
  '/:socioId/pago',
  ctrl.uploadMiddleware,
  ctrl.subirComprobanteCurso
);

router.post('/:socioId/cancelar', ctrl.cancelarCurso);

module.exports = router;