// routes/uploadRoutes.js
const express = require('express');
const uploadRoutes = express.Router();
const { cloudinary, upload } = require('../utils/cloudinary');

uploadRoutes.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const uploaded = await cloudinary.uploader.upload(fileStr, {
      folder: 'posts',
    });

    res.json({ secure_url: uploaded.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la imagen a Cloudinary' });
  }
});

module.exports = uploadRoutes;
