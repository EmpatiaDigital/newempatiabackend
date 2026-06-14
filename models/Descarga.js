// models/Descarga.js
const mongoose = require("mongoose");

const DescargaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["pdf", "video", "imagen", "libro"],
      required: [true, "El tipo es obligatorio."],
    },
    title: {
      type: String,
      required: [true, "El título es obligatorio."],
      trim: true,
      maxlength: [200, "El título no puede superar 200 caracteres."],
    },
    filename: {
      type: String,
      required: [true, "El nombre de archivo es obligatorio."],
      trim: true,
    },
    portada: {
      type: String,
      default: "",
    },
    fileData: {
      type: String, // base64 o URL externa
      required: [true, "El archivo es obligatorio."],
    },
  },
  {
    timestamps: true, // createdAt + updatedAt automáticos
  }
);

module.exports = mongoose.model("Descarga", DescargaSchema);