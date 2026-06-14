// backend/routes/actividad.js
const express = require("express");
const router = express.Router();
const Actividad = require("../models/userActividad"); // Mongoose schema

router.post("/user-actividad", async (req, res) => {
  try {
    const nueva = new Actividad(req.body);
    await nueva.save();
    res.status(201).send("Actividad registrada");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al registrar actividad");
  }
});

// backend/routes/actividad.js (agregado GET)
router.get("/user-actividad", async (req, res) => {
  try {
    const actividades = await Actividad.find({});
    res.json(actividades);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al obtener actividades");
  }
});

module.exports = router;
