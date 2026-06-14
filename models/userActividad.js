const mongoose = require("mongoose");

const actividadSchema = new mongoose.Schema({
  visitorId: String,
  ruta: String,
  evento: String, // 'visita', 'permanencia', 'compartido', 'PDFguiaDescarga', etc.
  postId: String,
  duracion: Number,
  titulo: String, // <--- Agregalo acá
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("userActividad", actividadSchema);

