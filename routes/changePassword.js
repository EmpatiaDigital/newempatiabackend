const express = require("express");
const router = express.Router();
const {
  sendVerificationCode,
  changePassword,
  changePasswordLoggedIn,
} = require("../controllers/changePasswordController");

const authMiddleware = require("../middleware/authMiddleware");

// Ruta para recuperar contraseña con código
router.post("/sendCode", sendVerificationCode);
router.post("/changePassword", changePassword);

// ✅ Ruta para cambiar contraseña logueado
router.put("/cambiar-password-logueado", authMiddleware, changePasswordLoggedIn);

module.exports = router;
