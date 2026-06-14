const mongoose = require("mongoose");

const SocioPorCiudadSchema = new mongoose.Schema({
  correo: { type: String, required: true, unique: true },
  cuota: { type: Number, default: 12 },
  provincia: { type: String, required: true, default: "no registrado" },
  ciudad: { type: String, required: true },
  socioId: { type: mongoose.Schema.Types.ObjectId, ref: "Socio" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // 👈 Nuevo campo
});

module.exports = mongoose.model("SocioPorCiudad", SocioPorCiudadSchema);
