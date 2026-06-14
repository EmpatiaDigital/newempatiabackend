const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  imagen: { type: String, default: 'https://via.placeholder.com/150' }, // URL imagen por defecto
  fecha: { type: Date, required: true },
  hora: { type: String, default: '' }, // opcional
  direccion: { type: String, required: true },
  organizador: { type: String, default: 'Sentidos' },
  objetivo: { type: String, required: true },
});

module.exports = mongoose.model('Actividad', actividadSchema);
