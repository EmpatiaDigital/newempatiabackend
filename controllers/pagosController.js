// controllers/pagosController.js
// ─────────────────────────────────────────────────────────────────────────────
// Lógica de negocio para el sistema de comprobantes de pago.
// Los comprobantes se suben a Cloudinary, optimizados (600x600, calidad auto ~96kb).
// ─────────────────────────────────────────────────────────────────────────────

const Pago   = require('../models/pagoModel');
const Cuota  = require('../models/cuotaModel');
const Socio  = require('../models/Socio');
const { cloudinary } = require('../config/cloudinary');

// ── Helper: subir buffer a Cloudinary ─────────────────────────────────────────
// Imágenes: se transforman a 600x600 máx, calidad automática orientada a ~96kb.
// PDFs: se suben como resource_type "raw" sin transformación.

function subirACloudinary(file) {
  return new Promise((resolve, reject) => {
    const esPdf = file.mimetype === 'application/pdf';

    const opciones = {
      folder: 'comprobantes',
      resource_type: esPdf ? 'raw' : 'image',
    };

    if (!esPdf) {
      opciones.transformation = [
        {
          width: 600,
          height: 600,
          crop: 'limit',
          quality: 'auto:low',
          fetch_format: 'auto',
        },
      ];
    }

    const stream = cloudinary.uploader.upload_stream(opciones, (error, result) => {
      if (error || !result) return reject(error || new Error('Error al subir a Cloudinary'));
      resolve(result);
    });

    stream.end(file.buffer);
  });
}

// ── Helper de optimización Cloudinary (para URLs ya existentes) ─────────────────
function optimizarCloudinary(url, params = 'f_auto,q_auto,w_600,h_600,c_limit') {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('/upload/f_auto') || url.includes('/upload/q_auto')) return url;
  return url.replace('/upload/', `/upload/${params}/`);
}

// ── POST /api/pagos  ──────────────────────────────────────────────────────────
// Body (multipart/form-data):  socioId, mes, anio, monto, comprobante (archivo)

exports.crearPago = async (req, res) => {
  try {
    const { socioId, mes, anio, monto } = req.body;
    const file = req.file;

    if (!socioId || !mes || !anio || !monto) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    if (!file) {
      return res.status(400).json({ success: false, error: 'No se recibió el comprobante' });
    }

    const socio = await Socio.findById(socioId).lean();
    if (!socio) return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    if (!socio.active) {
      return res.status(403).json({ success: false, error: 'Cuenta inactiva' });
    }

    // Verificar que no exista un pago en revisión o aceptado para ese mes/año
    const pagoExistente = await Pago.findOne({
      socioId,
      mes: Number(mes),
      anio: Number(anio),
      estado: { $in: ['comprobante_enviado', 'aceptado'] },
    });

    if (pagoExistente) {
      return res.status(409).json({
        success: false,
        error: pagoExistente.estado === 'aceptado'
          ? 'Esta cuota ya está marcada como pagada'
          : 'Ya enviaste un comprobante para esta cuota. Esperá la revisión.',
      });
    }

    // Subir a Cloudinary (optimizado: 600x600, calidad auto ~96kb para imágenes)
    let resultadoCloudinary;
    try {
      resultadoCloudinary = await subirACloudinary(file);
    } catch (cloudErr) {
      console.error('[pagos] error subiendo a Cloudinary:', cloudErr);
      return res.status(500).json({ success: false, error: 'No se pudo subir el comprobante' });
    }

    // Si había un pago rechazado previo, lo eliminamos (y borramos su archivo de Cloudinary)
    const pagoRechazado = await Pago.findOne({
      socioId,
      mes: Number(mes),
      anio: Number(anio),
      estado: 'rechazado',
    });

    if (pagoRechazado) {
      try {
        await cloudinary.uploader.destroy(pagoRechazado.comprobantePublicId, {
          resource_type: pagoRechazado.comprobanteTipo === 'application/pdf' ? 'raw' : 'image',
        });
      } catch {
        // si falla el borrado del archivo viejo, no bloqueamos el flujo
      }
      await pagoRechazado.deleteOne();
    }

    const nuevoPago = await Pago.create({
      socioId,
      mes:    Number(mes),
      anio:   Number(anio),
      monto:  Number(monto),
      comprobanteUrl:      resultadoCloudinary.secure_url,
      comprobantePublicId: resultadoCloudinary.public_id,
      comprobanteNombre:   file.originalname,
      comprobanteTipo:     file.mimetype,
      estado: 'comprobante_enviado',
    });

    return res.status(201).json({
      success: true,
      message: 'Comprobante enviado. El administrador lo revisará pronto.',
      pago: {
        _id:            nuevoPago._id,
        mes:            nuevoPago.mes,
        anio:           nuevoPago.anio,
        estado:         nuevoPago.estado,
        comprobanteUrl: nuevoPago.comprobanteUrl,
      },
    });
  } catch (err) {
    console.error('[pagos] crearPago:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── GET /api/pagos/socio/:socioId  ────────────────────────────────────────────
// Devuelve todos los pagos (comprobantes) de un socio.

exports.getPagosBySocio = async (req, res) => {
  try {
    const pagos = await Pago.find({ socioId: req.params.socioId })
      .select('mes anio monto estado comprobanteUrl comprobanteNombre fechaAccion notaAdmin createdAt')
      .lean();

    const pagosOptimizados = pagos.map((p) => ({
      ...p,
      comprobanteUrl: optimizarCloudinary(p.comprobanteUrl),
    }));

    return res.json(pagosOptimizados);
  } catch (err) {
    console.error('[pagos] getPagosBySocio:', err);
    return res.status(500).json({ error: 'Error al obtener pagos' });
  }
};

// ── GET /api/pagos  ───────────────────────────────────────────────────────────
// Lista todos los pagos pendientes de revisión (para el superadmin/admin).
// Opcionalmente filtra por ?estado=comprobante_enviado

exports.listarPagos = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;

    const pagos = await Pago.find(filtro)
      .populate('socioId', 'nombre apellido numeroSocio correo ciudad avatar')
      .sort({ createdAt: -1 })
      .lean();

    const pagosOptimizados = pagos.map((p) => ({
      ...p,
      comprobanteUrl: optimizarCloudinary(p.comprobanteUrl),
    }));

    return res.json(pagosOptimizados);
  } catch (err) {
    console.error('[pagos] listarPagos:', err);
    return res.status(500).json({ error: 'Error al listar pagos' });
  }
};

// ── GET /api/pagos/:id  ───────────────────────────────────────────────────────
// Detalle de un pago puntual.

exports.getPagoById = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id)
      .populate('socioId', 'nombre apellido numeroSocio correo ciudad avatar fechaInscripcion')
      .lean();

    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });

    pago.comprobanteUrl = optimizarCloudinary(pago.comprobanteUrl);

    return res.json(pago);
  } catch (err) {
    console.error('[pagos] getPagoById:', err);
    return res.status(500).json({ error: 'Error al obtener el pago' });
  }
};

// ── PUT /api/pagos/:id/aceptar  ───────────────────────────────────────────────
// El superadmin acepta el comprobante → marca la cuota como pagada.

exports.aceptarPago = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);
    if (!pago) return res.status(404).json({ success: false, error: 'Pago no encontrado' });

    if (pago.estado === 'aceptado') {
      return res.status(400).json({ success: false, error: 'Este pago ya fue aceptado' });
    }

    pago.estado       = 'aceptado';
    pago.notaAdmin    = req.body.notaAdmin || '';
    pago.fechaAccion  = new Date();
    await pago.save();

    await Cuota.findOneAndUpdate(
      { socioId: pago.socioId, mes: pago.mes, anio: pago.anio },
      {
        pagada:    true,
        monto:     pago.monto,
        fechaPago: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: 'Pago aceptado y cuota marcada como pagada', pago });
  } catch (err) {
    console.error('[pagos] aceptarPago:', err);
    return res.status(500).json({ success: false, error: 'Error al aceptar el pago' });
  }
};

// ── PUT /api/pagos/:id/rechazar  ──────────────────────────────────────────────
// El superadmin rechaza el comprobante → el socio puede volver a enviar.

exports.rechazarPago = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);
    if (!pago) return res.status(404).json({ success: false, error: 'Pago no encontrado' });

    if (pago.estado === 'rechazado') {
      return res.status(400).json({ success: false, error: 'Este pago ya fue rechazado' });
    }

    pago.estado      = 'rechazado';
    pago.notaAdmin   = req.body.notaAdmin || '';
    pago.fechaAccion = new Date();
    await pago.save();

    await Cuota.findOneAndUpdate(
      { socioId: pago.socioId, mes: pago.mes, anio: pago.anio },
      { pagada: false, monto: null, fechaPago: null },
      { new: true }
    );

    return res.json({ success: true, message: 'Pago rechazado. El socio puede reenviar el comprobante.', pago });
  } catch (err) {
    console.error('[pagos] rechazarPago:', err);
    return res.status(500).json({ success: false, error: 'Error al rechazar el pago' });
  }
};

// ── DELETE /api/pagos/:id  ────────────────────────────────────────────────────
// Elimina un pago (solo superadmin), incluyendo el archivo en Cloudinary.

exports.eliminarPago = async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);
    if (!pago) return res.status(404).json({ success: false, error: 'Pago no encontrado' });

    if (pago.comprobantePublicId) {
      try {
        await cloudinary.uploader.destroy(pago.comprobantePublicId, {
          resource_type: pago.comprobanteTipo === 'application/pdf' ? 'raw' : 'image',
        });
      } catch {
        // si falla el borrado en Cloudinary, igual eliminamos el registro
      }
    }

    await pago.deleteOne();
    return res.json({ success: true, message: 'Pago eliminado' });
  } catch (err) {
    console.error('[pagos] eliminarPago:', err);
    return res.status(500).json({ success: false, error: 'Error al eliminar el pago' });
  }
};