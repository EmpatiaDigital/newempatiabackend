const express = require("express");
const router = express.Router();
const PostLike = require("../models/PostLike");
const PostVista = require("../models/PostVista");
const mongoose = require("mongoose");
 
// ─── POST /api/posts/:id/vista ──────────────────────────────────────────────
router.post("/posts/:id/vista", async (req, res) => {
  const { visitorId } = req.body;
  const postId = req.params.id;
 
  if (!visitorId) return res.status(400).json({ error: "visitorId requerido" });
 
  try {
    await PostVista.findOneAndUpdate(
      { postId, visitorId },
      { postId, visitorId },
      { upsert: true, new: true }
    );
    const total = await PostVista.countDocuments({ postId });
    res.json({ vistas: total });
  } catch (error) {
    console.error("Error registrando vista:", error);
    res.status(500).json({ error: "Error interno" });
  }
});
 
// ─── GET /api/posts/:id/stats ───────────────────────────────────────────────
router.get("/posts/:id/stats", async (req, res) => {
  const postId = req.params.id;
  const { visitorId } = req.query;
 
  try {
    const vistas = await PostVista.countDocuments({ postId });
    const likes = await PostLike.countDocuments({ postId, tipo: "like" });
    const dislikes = await PostLike.countDocuments({ postId, tipo: "dislike" });
 
    let miVoto = null;
    if (visitorId) {
      const registro = await PostLike.findOne({ postId, visitorId });
      if (registro) miVoto = registro.tipo;
    }
 
    res.json({ vistas, likes, dislikes, miVoto });
  } catch (error) {
    console.error("Error obteniendo stats:", error);
    res.status(500).json({ error: "Error interno" });
  }
});
 
// ─── POST /api/posts/:id/like ───────────────────────────────────────────────
// Lógica:
//   - Sin voto previo  → agrega el tipo enviado
//   - Mismo voto       → lo elimina (toggle off)
//   - Voto distinto    → lo cambia al nuevo
router.post("/posts/:id/like", async (req, res) => {
  const postId = req.params.id;
  const { visitorId, tipo } = req.body;
 
  if (!visitorId || !tipo) {
    return res.status(400).json({ error: "visitorId y tipo son requeridos" });
  }
  if (!["like", "dislike"].includes(tipo)) {
    return res.status(400).json({ error: "tipo debe ser 'like' o 'dislike'" });
  }
 
  try {
    const existente = await PostLike.findOne({ postId, visitorId });
 
    if (!existente) {
      await PostLike.create({ postId, visitorId, tipo });
    } else if (existente.tipo === tipo) {
      await PostLike.deleteOne({ postId, visitorId });
    } else {
      existente.tipo = tipo;
      await existente.save();
    }
 
    const likes = await PostLike.countDocuments({ postId, tipo: "like" });
    const dislikes = await PostLike.countDocuments({ postId, tipo: "dislike" });
    const registro = await PostLike.findOne({ postId, visitorId });
    const miVoto = registro ? registro.tipo : null;
 
    res.json({ likes, dislikes, miVoto });
  } catch (error) {
    console.error("Error procesando voto:", error);
    res.status(500).json({ error: "Error interno" });
  }
});
 
// ─── GET /api/posts/:id/relacionados ───────────────────────────────────────
router.get("/posts/:id/relacionados", async (req, res) => {
  const postId = req.params.id;
 
  try {
    const Post = mongoose.model("Post");
    const postActual = await Post.findById(postId).select("titulo categoria tags");
 
    if (!postActual) return res.status(404).json({ error: "Post no encontrado" });
 
    const stopWords = ["para", "como", "este", "esta", "esto", "cual", "cuando", "donde", "porque", "pero", "sino", "sobre", "desde", "hasta", "entre", "durante"];
    const palabras = postActual.titulo
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length > 4 && !stopWords.includes(p));
 
    const regexPalabras = palabras.map((p) => new RegExp(p, "i"));
 
    const relacionados = await Post.find({
      _id: { $ne: postId },
      activo: true,
      $or: [
        { categoria: postActual.categoria },
        ...(regexPalabras.length > 0 ? [{ titulo: { $in: regexPalabras } }] : []),
        ...(postActual.tags && postActual.tags.length > 0
          ? [{ tags: { $in: postActual.tags } }]
          : []),
      ],
    })
      .select("_id titulo categoria portada fecha epigrafe autor")
      .sort({ fecha: -1 })
      .limit(4);
 
    res.json(relacionados);
  } catch (error) {
    console.error("Error obteniendo relacionados:", error);
    res.status(500).json({ error: "Error interno" });
  }
});
 
module.exports = router;
