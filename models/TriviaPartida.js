// models/TriviaPartida.js
const mongoose = require('mongoose');

const TriviaPartidaSchema = new mongoose.Schema({
  // null si es anonimo
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  // fingerprint para todos los jugadores
  visitorId: {
    type: String,
    required: true,
    index: true,
  },
  // Nombre opcional: lo deja el jugador al final para aparecer en ranking
  nombre: {
    type: String,
    default: null,
    maxlength: 40,
  },
  // IDs de preguntas jugadas (indices del JSON)
  preguntasJugadas: {
    type: [Number],
    default: [],
  },
  puntaje: {
    type: Number,
    required: true,
    min: 0,
  },
  puntajeMaximo: {
    type: Number,
    required: true,
  },
  porcentaje: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  respuestasCorrectas: {
    type: Number,
    required: true,
  },
  totalPreguntas: {
    type: Number,
    required: true,
  },
  rango: {
    type: String,
    enum: ['PRO', 'MEDIUM', 'APRENDIZ'],
    required: true,
  },
  // Tiempo total de la partida en segundos (para desempate en ranking)
  tiempoSegundos: {
    type: Number,
    default: null,
  },
  completada: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indice para ranking: mayor puntaje, menor tiempo
TriviaPartidaSchema.index({ puntaje: -1, tiempoSegundos: 1 });
// Indice para buscar por visitorId + completada
TriviaPartidaSchema.index({ visitorId: 1, completada: 1 });
// Indice para estadisticas globales
TriviaPartidaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TriviaPartida', TriviaPartidaSchema);
