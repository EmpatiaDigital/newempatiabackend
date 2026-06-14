const express = require("express");
const router  = express.Router();
const { upload } = require("../utils/cloudinary");

const {
  listarDescargas,
  obtenerDescarga,
  crearDescarga,
  actualizarDescarga,
  eliminarDescarga,
} = require("../controllers/descargaController");

const authMiddleware = require("../middleware/authMiddleware");

// Multer acepta dos campos: "file" (recurso) y "portadaFile" (imagen de portada)
const uploadFields = upload.fields([
  { name: "file",        maxCount: 1 },
  { name: "portadaFile", maxCount: 1 },
]);

// Públicas
router.get("/",    listarDescargas);
router.get("/:id", obtenerDescarga);

// Protegidas
router.post(  "/",    authMiddleware, uploadFields, crearDescarga);
router.put(   "/:id", authMiddleware, uploadFields, actualizarDescarga);
router.delete("/:id", authMiddleware,               eliminarDescarga);

module.exports = router;