// models/parametrosCuotaModel.js

const mongoose = require("mongoose");

const parametrosCuotaSchema = new mongoose.Schema(
  {
    montoBase: {
      type: Number,
      required: true,
      default: 5000,
    },
    diaCierre: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
      max: 28,
    },
    moneda: {
      type: String,
      enum: ["ARS", "USD"],
      default: "ARS",
    },
  },
  { timestamps: true }
);

// Solo existe un documento de configuración global
module.exports = mongoose.model("ParametrosCuota", parametrosCuotaSchema);