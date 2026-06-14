// routes/triviaRoutes.js

const express = require('express');
const router  = express.Router();
const TriviaPartida = require('../models/TriviaPartida');
const jwt = require('jsonwebtoken');

// ─── Helper: extrae userId del token si existe, sin bloquear ─────────────────
const getUserIdFromToken = (req) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    return payload.userId || payload.id || null;
  } catch {
    return null;
  }
};

// ─── POST /api/trivia/partida — Guardar partida al terminar ──────────────────
router.post('/partida', async (req, res) => {
  const {
    visitorId,
    preguntasJugadas,
    puntaje,
    puntajeMaximo,
    porcentaje,
    respuestasCorrectas,
    totalPreguntas,
    rango,
    tiempoSegundos, // nuevo: tiempo total de la partida en segundos
    nombre,         // nuevo: nombre opcional para aparecer en ranking
  } = req.body;

  if (!visitorId) return res.status(400).json({ error: 'visitorId requerido' });
  if (puntaje === undefined || !rango) return res.status(400).json({ error: 'Datos de partida incompletos' });

  try {
    const userId = getUserIdFromToken(req);

    const partida = await TriviaPartida.create({
      userId,
      visitorId,
      preguntasJugadas: preguntasJugadas || [],
      puntaje,
      puntajeMaximo,
      porcentaje,
      respuestasCorrectas,
      totalPreguntas,
      rango,
      tiempoSegundos: tiempoSegundos || null,
      nombre: nombre ? nombre.trim().slice(0, 40) : null,
      completada: true,
    });

    res.status(201).json({ ok: true, partidaId: partida._id });
  } catch (err) {
    console.error('Error guardando partida:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/trivia/top3 — Top 3 para mostrar durante el juego ─────────────
// Criterio: mayor puntaje, desempate por menor tiempo
router.get('/top3', async (req, res) => {
  try {
    const top3 = await TriviaPartida.aggregate([
      {
        $match: {
          completada: true,
          nombre: { $ne: null, $ne: '' }, // solo los que dejaron nombre
        },
      },
      // Una entrada por visitorId: mejor partida de cada jugador
      {
        $sort: { puntaje: -1, tiempoSegundos: 1, createdAt: -1 },
      },
      {
        $group: {
          _id: '$visitorId',
          nombre:            { $first: '$nombre' },
          mejorPuntaje:      { $first: '$puntaje' },
          porcentaje:        { $first: '$porcentaje' },
          tiempoSegundos:    { $first: '$tiempoSegundos' },
          rango:             { $first: '$rango' },
          totalPartidas:     { $sum: 1 },
        },
      },
      { $sort: { mejorPuntaje: -1, tiempoSegundos: 1 } },
      { $limit: 3 },
      {
        $project: {
          _id: 0,
          nombre: 1,
          mejorPuntaje: 1,
          porcentaje: 1,
          tiempoSegundos: 1,
          rango: 1,
          totalPartidas: 1,
        },
      },
    ]);

    res.json(top3);
  } catch (err) {
    console.error('Error obteniendo top3:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/trivia/ranking — Top 10 con nombre (no requiere login) ─────────
router.get('/ranking', async (req, res) => {
  try {
    const ranking = await TriviaPartida.aggregate([
      {
        $match: {
          completada: true,
          nombre: { $ne: null, $ne: '' },
        },
      },
      { $sort: { puntaje: -1, tiempoSegundos: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$visitorId',
          nombre:              { $first: '$nombre' },
          mejorPuntaje:        { $first: '$puntaje' },
          porcentaje:          { $first: '$porcentaje' },
          tiempoSegundos:      { $first: '$tiempoSegundos' },
          mejorRango:          { $first: '$rango' },
          totalPartidas:       { $sum: 1 },
          porcentajePromedio:  { $avg: '$porcentaje' },
        },
      },
      { $sort: { mejorPuntaje: -1, tiempoSegundos: 1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          nombre: 1,
          mejorPuntaje: 1,
          porcentaje: 1,
          tiempoSegundos: 1,
          mejorRango: 1,
          totalPartidas: 1,
          porcentajePromedio: { $round: ['$porcentajePromedio', 0] },
        },
      },
    ]);

    res.json(ranking);
  } catch (err) {
    console.error('Error obteniendo ranking:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/trivia/stats — Estadisticas globales ───────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totales] = await TriviaPartida.aggregate([
      { $match: { completada: true } },
      {
        $group: {
          _id: null,
          totalPartidas:        { $sum: 1 },
          promedioGlobal:       { $avg: '$porcentaje' },
          puntajeMaximoEver:    { $max: '$puntaje' },
          totalJugadoresUnicos: { $addToSet: '$visitorId' },
        },
      },
      {
        $project: {
          _id: 0,
          totalPartidas: 1,
          promedioGlobal:       { $round: ['$promedioGlobal', 1] },
          puntajeMaximoEver: 1,
          totalJugadoresUnicos: { $size: '$totalJugadoresUnicos' },
        },
      },
    ]);

    const distribucionRangos = await TriviaPartida.aggregate([
      { $match: { completada: true } },
      { $group: { _id: '$rango', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } },
    ]);

    res.json({ ...(totales || {}), distribucionRangos });
  } catch (err) {
    console.error('Error obteniendo stats globales:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
