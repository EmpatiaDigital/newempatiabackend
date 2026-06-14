const express = require('express');
const router = express.Router();
const inscripcionController = require('../controllers/inscriptionController');

// Rutas para inscripciones
router.get('/curso/:cursoId', inscripcionController.getInscripcionesByCurso);
router.get('/estadisticas/:cursoId', inscripcionController.getEstadisticasCurso);
router.get('/:id', inscripcionController.getInscripcionById);
router.post('/', inscripcionController.crearInscripcion);
router.put('/:id', inscripcionController.actualizarInscripcion);
router.patch('/:id/estado', inscripcionController.actualizarEstadoInscripcion);
router.patch('/:id/cancelar', inscripcionController.cancelarInscripcion);
router.delete('/:id', inscripcionController.eliminarInscripcion);
router.post('/sincronizar/:cursoId', inscripcionController.sincronizarCupos);

module.exports = router;
