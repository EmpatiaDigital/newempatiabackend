const express = require('express');
const router = express.Router();

const { registrarSocio } = require('../controllers/socioController');
const { obtenerSocios } = require('../controllers/buscaSocioController');
const { editSocio } = require('../controllers/editSocioController');

const { upload } = require('../utils/cloudinary'); // <-- importá upload acá

router.post('/register', registrarSocio);
router.get('/socios/obtener', obtenerSocios);

router.put('/socios/editar', upload.single('avatar'), editSocio);

module.exports = router;
