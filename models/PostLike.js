// models/PostLike.js
const mongoose = require("mongoose");

const PostLikeSchema = new mongoose.Schema({
  postId: { type: String, required: true },
  visitorId: { type: String, required: true }, // userId si está logueado, fingerprint si no
  tipo: { type: String, enum: ["like", "dislike"], required: true },
  fecha: { type: Date, default: Date.now },
});

// Índice único: un visitorId solo puede tener UN registro por post
PostLikeSchema.index({ postId: 1, visitorId: 1 }, { unique: true });

module.exports = mongoose.model("PostLike", PostLikeSchema);
