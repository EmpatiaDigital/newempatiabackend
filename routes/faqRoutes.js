const express = require("express");
const router = express.Router();
const Faq = require("../models/Faq");
const authMiddleware = require("../middleware/authMiddleware");

// GET público
router.get("/", async (req, res) => {
  try {
    const faqs = await Faq.find({ activo: true }).sort({ orden: 1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener preguntas frecuentes" });
  }
});

// GET admin (todas, incluye inactivas) - solo superadmin
router.get("/admin", authMiddleware, async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Acceso denegado: se requiere rol superadmin" });
  }

  try {
    const faqs = await Faq.find().sort({ orden: 1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener preguntas frecuentes" });
  }
});

// POST - solo superadmin
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Acceso denegado: se requiere rol superadmin" });
  }

  try {
    const { pregunta, respuesta, orden, activo } = req.body;
    const nuevaFaq = new Faq({ pregunta, respuesta, orden, activo });
    await nuevaFaq.save();
    res.status(201).json(nuevaFaq);
  } catch (error) {
    res.status(500).json({ error: "Error al crear pregunta frecuente" });
  }
});

// PUT - solo superadmin
router.put("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Acceso denegado: se requiere rol superadmin" });
  }

  try {
    const { pregunta, respuesta, orden, activo } = req.body;
    const faqActualizada = await Faq.findByIdAndUpdate(
      req.params.id,
      { pregunta, respuesta, orden, activo },
      { new: true }
    );
    if (!faqActualizada) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }
    res.json(faqActualizada);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar pregunta frecuente" });
  }
});

// DELETE - solo superadmin
router.delete("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Acceso denegado: se requiere rol superadmin" });
  }

  try {
    const faqEliminada = await Faq.findByIdAndDelete(req.params.id);
    if (!faqEliminada) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }
    res.json({ message: "Pregunta eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar pregunta frecuente" });
  }
});

module.exports = router;