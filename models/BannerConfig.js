const mongoose = require('mongoose');

const bannerConfigSchema = new mongoose.Schema({
  textoBase: {
    type: String,
    default: "Miles de personas ya conocieron Empatía Digital y accedieron a contenidos sobre seguridad, ciudadanía y bienestar digital.",
  },
  activo: { type: Boolean, default: true },
  mostrarStats: { type: Boolean, default: false },
  seguidoresRedes: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('BannerConfig', bannerConfigSchema);