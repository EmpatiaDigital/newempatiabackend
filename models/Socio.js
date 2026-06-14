const mongoose = require("mongoose");

const socioSchema = new mongoose.Schema({
  nombre:      { type: String, required: true },
  apellido:    { type: String, required: true },
  correo:      { type: String, required: true, unique: true },
  // telefono: no requerido y sin índice único para evitar conflictos con vacíos
  telefono:    { type: String, default: "" },
  // provincia: no requerida, viene con default cuando el frontend no la manda
  provincia:   { type: String, default: "no registrado" },
  ciudad:      { type: String, required: true },
  numeroSocio: { type: Number, required: true, unique: true },
  role:        { type: String, default: "socio" },
  cuota:       { type: Number, default: 12 },
  avatar:      { type: String },
  active:      { type: Boolean, default: true },
  freezeUntil: { type: Date, default: null },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fechaInscripcion: { type: Date, default: Date.now },
});

const Socio = mongoose.model("Socio", socioSchema);
module.exports = Socio;
