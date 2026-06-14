//models/PostVista.js
const mongoose = require("mongoose");

const PostVistaSchema = new mongoose.Schema({
  postId: { type: String, required: true },
  visitorId: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
});

// Índice único: un visitorId solo puede tener UNA vista registrada por post
PostVistaSchema.index({ postId: 1, visitorId: 1 }, { unique: true });

module.exports = mongoose.model("PostVista", PostVistaSchema);
