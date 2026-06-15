const BannerConfig = require('../models/BannerConfig');

// GET /api/banner-config — público
const getConfig = async (req, res) => {
  try {
    let config = await BannerConfig.findOne();
    if (!config) config = await BannerConfig.create({});
    return res.json(config);
  } catch (error) {
    console.error("Error al obtener config de banner:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PUT /api/banner-config — solo superadmin
const updateConfig = async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Acceso restringido a superadmin" });
  }

  const { textoBase, activo, mostrarStats, seguidoresRedes } = req.body;

  try {
    let config = await BannerConfig.findOne();
    if (!config) config = new BannerConfig();

    if (textoBase !== undefined) config.textoBase = textoBase;
    if (activo !== undefined) config.activo = activo;
    if (mostrarStats !== undefined) config.mostrarStats = mostrarStats;
    if (seguidoresRedes !== undefined) config.seguidoresRedes = seguidoresRedes;

    await config.save();
    return res.json(config);
  } catch (error) {
    console.error("Error al actualizar config de banner:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = { getConfig, updateConfig };