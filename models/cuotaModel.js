// models/cuotaModel.js

const mongoose = require("mongoose");

const cuotaSchema = new mongoose.Schema(
  {
    socioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Socio",
      required: true,
    },
    mes: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    anio: {
      type: Number,
      required: true,
    },
    pagada: {
      type: Boolean,
      default: false,
    },
    monto: {
      type: Number,
      default: null,
    },
    fechaPago: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Evita duplicados: un socio no puede tener dos registros para el mismo mes/año
cuotaSchema.index({ socioId: 1, mes: 1, anio: 1 }, { unique: true });

module.exports = mongoose.model("Cuota", cuotaSchema);