const mongoose = require('mongoose');

const FaqSchema = new mongoose.Schema(
  {
    pregunta: { type: String, required: true },
    respuesta: { type: String, required: true },
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Faq', FaqSchema);