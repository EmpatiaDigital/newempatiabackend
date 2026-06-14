const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require("path");

// Routes
const authRoutes = require('./routes/authRoutes');
const pagosRoutes = require('./routes/pagosRoutes');
const sociosRoutes = require('./routes/authSocios');
const changePassword = require('./routes/changePassword');
const postRoutes = require('./routes/postRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const routesActividades = require('./routes/routesActividades');
const activeRoutes = require('./routes/activeRoutes');
const descargaRoutes = require('./routes/descargaRoutes');
const userActividadRoutes = require('./routes/userActividad');
const courseRoutes = require('./routes/courseRoutes');
const inscriptionRoutes = require('./routes/inscriptionRoutes');
const postStatsRoutes = require('./routes/postStatsRoutes');
const sitemapRoute = require('./routes/sitemap-route');
const triviaRoutes = require('./routes/triviaRoutes');
const cuotasRoutes = require("./routes/cuotasRoutes");
const tusCursosRoutes = require('./routes/tusCursosRoutes');
const faqRoutes = require('./routes/faqRoutes');

dotenv.config();
const app = express();
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use("/descargas", express.static(path.join(__dirname, "public/descargas")));
// ─── Connection caching para Vercel serverless ────────────────────────────────
let connectionPromise = null;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect("mongodb+srv://empatiadigital2025:Gali282016@empatia1.s1i7isu.mongodb.net/?retryWrites=true&w=majority&appName=Empatia1", {
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
  }
  await connectionPromise;
}
// ─── Middleware: conectar DB antes de cualquier request a /api ────────────────
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Error de conexión a MongoDB:', err.message);
    return res.status(503).json({
      error: 'Servicio no disponible — base de datos no conectada, reintentá en unos segundos'
    });
  }
});
// ─── Middleware: conectar DB antes del sitemap ────────────────────────────────
app.use('/sitemap.xml', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Error de conexión a MongoDB (sitemap):', err.message);
    return res.status(503).send('Servicio no disponible');
  }
});
// Rutas
app.get('/', (req, res) => res.send('Backend activo'));
app.use('/', sitemapRoute);
app.use('/api', changePassword);
app.use('/api/tuscursos', tusCursosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', sociosRoutes);
app.use('/api', postRoutes);
app.use('/api', uploadRoutes);
app.use('/api', activeRoutes);
app.use('/api/actividades', routesActividades);
app.use('/api/descarga', descargaRoutes);
app.use('/api', userActividadRoutes);
app.use('/api', postStatsRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/trivia', triviaRoutes);
app.use("/api/cuotas", cuotasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/faqs', faqRoutes);

// ─── Exportar para Vercel (NO usar app.listen) ────────────────────────────────

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    console.log('--------------------------------------------------');
    console.log(`🚀 Backend de Empatía activo en: http://localhost:${PORT}`);
    console.log('✅ Servidor listo para recibir peticiones.');
    console.log('--------------------------------------------------');
  });
}


module.exports = app;
