const Descarga = require("../models/Descarga");
const nodemailer = require("nodemailer");
const { cloudinary } = require("../utils/cloudinary");
const streamifier = require("streamifier");

// ── Transporter ──────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "empatiadigital2025@gmail.com",
    pass: process.env.GMAIL_APP_PASS,
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sube un buffer a Cloudinary.
 * resourceType: "image" | "video" | "raw"  (raw = PDF, docs, etc.)
 */
const subirACloudinary = (buffer, folder, resourceType = "raw") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

/**
 * Devuelve el resource_type correcto para Cloudinary según el mimetype.
 */
const getResourceType = (mimetype = "") => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "raw"; // PDF, docs, etc.
};

const enviarCorreoNuevoRecurso = async ({ title, type, portada, email }) => {
  if (!email) return;
  await transporter.sendMail({
    from: '"Empatía Digital" <empatiadigital2025@gmail.com>',
    to: email,
    subject: `¡Nuevo recurso disponible! 📥`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#333">
        <h2 style="color:#4CAF50">Nuevo recurso: <strong>${title}</strong></h2>
        <p>Se publicó un nuevo recurso (${type}) en la plataforma.</p>
        ${portada ? `<img src="${portada}" style="max-width:100%;border-radius:10px;margin:10px 0"/>` : ""}
        <p>
          <a href="https://empatiadigital.com.ar/recursos"
             style="background:#4CAF50;color:#fff;padding:10px 15px;border-radius:5px;text-decoration:none">
            Ver y descargar
          </a>
        </p>
        <p>Gracias por confiar en <strong>Empatía Digital</strong> 💚</p>
      </div>`,
  });
};

// ── Controladores ────────────────────────────────────────────────────────────

/**
 * GET /api/descarga
 * Público — lista todos los recursos.
 * IMPORTANTE: NO excluimos fileData porque ahora es una URL de Cloudinary
 * (no base64 pesado). El frontend la necesita para mostrar videos y PDFs.
 */
const listarDescargas = async (req, res) => {
  try {
    const filtro = req.query.type ? { type: req.query.type } : {};
    const items = await Descarga.find(filtro).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/descarga/:id
 * Público — recurso completo.
 */
const obtenerDescarga = async (req, res) => {
  try {
    const item = await Descarga.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Recurso no encontrado." });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/descarga
 * Protegido — superadmin.
 *
 * Acepta multipart/form-data con:
 *   - file        (archivo real: PDF, imagen, video)   — opcional si se envía fileUrl
 *   - portadaFile (imagen de portada)                  — opcional si se envía portada (URL)
 *   - title, type, filename, email                     — campos de texto
 *   - fileUrl     (URL externa, ej. YouTube o libro)   — alternativa a file
 *   - portada     (URL externa de portada)             — alternativa a portadaFile
 */
const crearDescarga = async (req, res) => {
  try {
    const { title, type, filename, email, fileUrl, portada: portadaUrl } = req.body;

    if (!title || !type || !filename) {
      return res.status(400).json({ error: "Faltan campos: title, type, filename." });
    }

    const tiposPermitidos = ["pdf", "video", "imagen", "libro"];
    if (!tiposPermitidos.includes(type)) {
      return res.status(400).json({ error: `Tipo no válido. Permitidos: ${tiposPermitidos.join(", ")}.` });
    }

    // ── 1. Resolver URL del archivo principal ──────────────────────
    let finalFileData = fileUrl || null;

    const archivoFile = req.files?.file?.[0];
    if (archivoFile) {
      const resourceType = getResourceType(archivoFile.mimetype);
      const result = await subirACloudinary(archivoFile.buffer, "empatia/recursos", resourceType);
      finalFileData = result.secure_url;
    }

    if (!finalFileData) {
      return res.status(400).json({ error: "Debés subir un archivo o proveer una URL (fileUrl)." });
    }

    // ── 2. Resolver portada ────────────────────────────────────────
    let finalPortada = portadaUrl || "";

    const portadaFile = req.files?.portadaFile?.[0];
    if (portadaFile) {
      const result = await subirACloudinary(portadaFile.buffer, "empatia/portadas", "image");
      finalPortada = result.secure_url;
    }

    // ── 3. Guardar en MongoDB ──────────────────────────────────────
    const nuevo = new Descarga({
      type,
      title,
      filename,
      portada: finalPortada,
      fileData: finalFileData,
    });
    await nuevo.save();

    // Correo en background
    enviarCorreoNuevoRecurso({ title, type, portada: finalPortada, email }).catch(console.error);

    res.status(201).json(nuevo.toObject());
  } catch (err) {
    console.error("[POST /api/descarga]", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /api/descarga/:id
 * Protegido — superadmin.
 * Actualiza solo los campos que se envían; el resto se mantiene.
 */
const actualizarDescarga = async (req, res) => {
  try {
    const { title, type, filename, fileUrl, portada: portadaUrl } = req.body;

    if (type) {
      const tiposPermitidos = ["pdf", "video", "imagen", "libro"];
      if (!tiposPermitidos.includes(type)) {
        return res.status(400).json({ error: "Tipo no válido." });
      }
    }

    const campos = {};
    if (title)    campos.title    = title;
    if (type)     campos.type     = type;
    if (filename) campos.filename = filename;

    // Portada: archivo tiene prioridad sobre URL
    const portadaFile = req.files?.portadaFile?.[0];
    if (portadaFile) {
      const result = await subirACloudinary(portadaFile.buffer, "empatia/portadas", "image");
      campos.portada = result.secure_url;
    } else if (portadaUrl) {
      campos.portada = portadaUrl;
    }

    // Archivo principal: archivo tiene prioridad sobre URL
    const archivoFile = req.files?.file?.[0];
    if (archivoFile) {
      const resourceType = getResourceType(archivoFile.mimetype);
      const result = await subirACloudinary(archivoFile.buffer, "empatia/recursos", resourceType);
      campos.fileData = result.secure_url;
    } else if (fileUrl) {
      campos.fileData = fileUrl;
    }

    if (Object.keys(campos).length === 0) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar." });
    }

    const actualizado = await Descarga.findByIdAndUpdate(
      req.params.id,
      { $set: campos },
      { new: true, runValidators: true }
    );

    if (!actualizado) return res.status(404).json({ error: "Recurso no encontrado." });
    res.json(actualizado.toObject());
  } catch (err) {
    console.error("[PUT /api/descarga/:id]", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/descarga/:id
 */
const eliminarDescarga = async (req, res) => {
  try {
    const eliminado = await Descarga.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ error: "Recurso no encontrado." });
    res.json({ message: "Eliminado correctamente.", id: eliminado._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listarDescargas,
  obtenerDescarga,
  crearDescarga,
  actualizarDescarga,
  eliminarDescarga,
};