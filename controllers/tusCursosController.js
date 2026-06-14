// controllers/tusCursosController.js
// ─────────────────────────────────────────────────────────────────────────────
// Gestión de cursos del socio: consulta, pago con comprobante y cancelación
// con reembolso parcial del 40 % si se cancela un día antes del inicio.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const nodemailer = require('nodemailer');
const Inscription = require('../models/Inscription');
const CursoPago = require('../models/CursoPago');
const Course = require('../models/Course');
const Socio = require('../models/Socio');

// ── Multer ────────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/curso-comprobantes');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `curso-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Formato inválido. Usá JPG, PNG, WEBP o PDF.'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadMiddleware = upload.single('comprobante');

// ── Mailer ────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "empatiadigital2025@gmail.com",
    pass: "nbnh gere gtos vors",
  },
});

async function enviarEmailCancelacion({ nombre, apellido, email, courseName, montoReembolso, moneda }) {
  const montoFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda || 'ARS',
    maximumFractionDigits: 0,
  }).format(montoReembolso ?? 0);

  const textoReembolso =
    montoReembolso > 0
      ? `<p style="margin:0 0 16px">Como tu baja fue registrada con menos de 24 horas de anticipación al inicio, 
         te procesaremos un reembolso del <strong>40 %</strong> del pago realizado 
         (<strong>${montoFmt}</strong>). Nos pondremos en contacto para coordinar la devolución.</p>`
      : '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Hasta pronto, ${nombre}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2744 0%,#2563eb 100%);padding:40px 48px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                Empatía Digital
              </h1>
              <p style="margin:8px 0 0;color:#93c5fd;font-size:14px;letter-spacing:2px;text-transform:uppercase;">
                Hasta pronto
              </p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a2744;">
                Hola, ${nombre} ${apellido} 👋
              </p>
              <p style="margin:0 0 16px;color:#4b5563;line-height:1.7;">
                Queremos avisarte que registramos tu baja del curso 
                <strong style="color:#1a2744;">"${courseName}"</strong>.
              </p>
              <p style="margin:0 0 16px;color:#4b5563;line-height:1.7;">
                Por supuesto, entendemos que la vida tiene sus propios tiempos y que cada uno camina 
                a su ritmo. Lo importante es que este espacio siempre va a estar acá para vos.
              </p>

              ${textoReembolso}

              <p style="margin:0 0 16px;color:#4b5563;line-height:1.7;">
                Ser parte de Empatía Digital no caduca. Cuando quieras volver — ya sea para este 
                curso, para otro, o simplemente para compartir un café virtual con la comunidad — 
                las puertas están abiertas de par en par.
              </p>
              <p style="margin:0 0 32px;color:#4b5563;line-height:1.7;">
                Y de vez en cuando, te vamos a mandar algún mensaje para saber cómo estás o 
                contarte novedades que creemos que pueden interesarte. Sin presiones, prometido.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="http://localhost:3000"
                       style="display:inline-block;background:#f97316;color:#ffffff;font-weight:700;
                              font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;
                              letter-spacing:0.3px;">
                      Volver a Empatía Digital →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 48px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                Este mensaje fue enviado porque sos parte de la familia Empatía Digital.<br/>
                Si crees que hay un error, escribinos a 
                <a href="mailto:empatiadigital2025@gmail.com" style="color:#2563eb;">empatiadigital2025@gmail.com</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await transporter.sendMail({
    from: '"Empatía Digital" <empatiadigital2025@gmail.com>',
    to: email,
    subject: `Hasta pronto, ${nombre} — te esperamos cuando quieras`,
    html,
  });
}

// ── GET /api/tuscursos/:socioId ───────────────────────────────────────────────
exports.getMisCursos = async (req, res) => {
  try {
    const { socioId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(socioId)) {
      return res.status(400).json({ success: false, error: 'ID de socio inválido' });
    }

    const socio = await Socio.findById(socioId).lean();
    if (!socio) {
      return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    }

    const inscripciones = await Inscription.find({
      $or: [
        { socioId: new mongoose.Types.ObjectId(socioId) },
        { email: socio.correo },
      ],
      estado: { $ne: 'cancelado' },
    })
      .populate('courseId')
      .lean();

    // Backfill: asignar socioId a inscripciones viejas encontradas por email
    if (inscripciones.length > 0) {
      await Inscription.updateMany(
        {
          email: socio.correo,
          $or: [{ socioId: null }, { socioId: { $exists: false } }],
        },
        { $set: { socioId: new mongoose.Types.ObjectId(socioId) } }
      );
    }

    const result = await Promise.all(
      inscripciones.map(async (insc) => {
        const pago = await CursoPago.findOne({ inscriptionId: insc._id }).lean();
        const course = insc.courseId;

        // precio en el schema es String → castear a Number
        const precioNum = course?.precio ? Number(course.precio) : null;

        return {
          inscriptionId:     insc._id,
          courseId:          course?._id,
          courseTitle:       course?.titulo          ?? '—',
          courseDescription: course?.descripcion     ?? '',
          courseImage:       course?.imagenPrincipal ?? null,
          fechaInicio:       course?.fechaInicio      ?? null,
          fechaFin:          null,   // no existe en el schema de Course
          duracion:          course?.duracion         ?? null,
          modalidad:         course?.modalidad        ?? null,
          turnoPreferido:    insc.turnoPreferido,
          estadoInscripcion: insc.estado,
          fechaInscripcion:  insc.createdAt,
          pago: pago
            ? {
                pagoId:         pago._id,
                estadoPago:     pago.estadoPago,
                monto:          pago.monto,
                moneda:         pago.moneda,
                comprobanteUrl: pago.comprobanteUrl,
                fechaPago:      pago.fechaPago,
              }
            : {
                pagoId:         null,
                estadoPago:     'sin_pago',
                monto:          precioNum,
                moneda:         course?.moneda ?? 'ARS',
                comprobanteUrl: null,
                fechaPago:      null,
              },
        };
      })
    );

    return res.json({
      success: true,
      socio: {
        nombre:   socio.nombre,
        apellido: socio.apellido,
        correo:   socio.correo,
      },
      cursos: result,
    });
  } catch (err) {
    console.error('[getMisCursos]', err);
    return res.status(500).json({ success: false, error: 'Error al obtener los cursos' });
  }
};

// ── POST /api/tuscursos/:socioId/pago ─────────────────────────────────────────
exports.subirComprobanteCurso = async (req, res) => {
  try {
    const { socioId } = req.params;
    const { inscriptionId, monto } = req.body;

    if (!mongoose.Types.ObjectId.isValid(socioId) || !mongoose.Types.ObjectId.isValid(inscriptionId)) {
      return res.status(400).json({ success: false, error: 'IDs inválidos' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Falta el comprobante' });
    }

    const socio = await Socio.findById(socioId).lean();
    const insc = await Inscription.findOne({
      _id: inscriptionId,
      $or: [
        { socioId: new mongoose.Types.ObjectId(socioId) },
        { email: socio?.correo },
      ],
    }).populate('courseId');

    if (!insc) {
      return res.status(404).json({ success: false, error: 'Inscripción no encontrada' });
    }

    const comprobanteUrl = `/uploads/curso-comprobantes/${req.file.filename}`;

    // precio en schema es String → castear a Number
    const precioDelCurso = insc.courseId?.precio ? Number(insc.courseId.precio) : 0;
    const montoFinal = monto ? Number(monto) : precioDelCurso;
    const moneda = insc.courseId?.moneda ?? 'ARS';

    const pago = await CursoPago.findOneAndUpdate(
      { inscriptionId },
      {
        $set: {
          socioId,
          courseId:    insc.courseId._id,
          estadoPago:  'comprobante_enviado',
          comprobanteUrl,
          monto:       montoFinal,
          moneda,
        },
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, pago });
  } catch (err) {
    console.error('[subirComprobanteCurso]', err);
    return res.status(500).json({ success: false, error: 'Error al subir el comprobante' });
  }
};

// ── POST /api/tuscursos/:socioId/cancelar ────────────────────────────────────
exports.cancelarCurso = async (req, res) => {
  try {
    const { socioId } = req.params;
    const { inscriptionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(socioId) || !mongoose.Types.ObjectId.isValid(inscriptionId)) {
      return res.status(400).json({ success: false, error: 'IDs inválidos' });
    }

    const socio = await Socio.findById(socioId).lean();
    if (!socio) {
      return res.status(404).json({ success: false, error: 'Socio no encontrado' });
    }

    const insc = await Inscription.findOne({
      _id: inscriptionId,
      $or: [
        { socioId: new mongoose.Types.ObjectId(socioId) },
        { email: socio.correo },
      ],
    }).populate('courseId');

    if (!insc) {
      return res.status(404).json({ success: false, error: 'Inscripción no encontrada' });
    }
    if (insc.estado === 'cancelado') {
      return res.status(400).json({ success: false, error: 'La inscripción ya estaba cancelada' });
    }

    const course = insc.courseId;

    const ahora = new Date();
    const inicio = course?.fechaInicio ? new Date(course.fechaInicio) : null;
    const diffMs = inicio ? inicio.getTime() - ahora.getTime() : Infinity;
    const diffHoras = diffMs / (1000 * 60 * 60);
    const unDiaAntes = diffHoras <= 24 && diffHoras >= 0;

    const pago = await CursoPago.findOne({ inscriptionId });
    let montoReembolso = 0;
    let porcentajeReembolso = 0;

    if (pago && pago.estadoPago === 'pagado' && unDiaAntes) {
      porcentajeReembolso = 40;
      montoReembolso = Math.round(pago.monto * 0.4);
    }

    insc.estado = 'cancelado';
    await insc.save();

    if (pago) {
      pago.cancelado            = true;
      pago.montoReembolso       = montoReembolso;
      pago.porcentajeReembolso  = porcentajeReembolso;
      pago.fechaCancelacion     = ahora;
      await pago.save();
    }

    const emailDestino    = socio.correo    || insc.email;
    const nombreDestino   = socio.nombre    || insc.nombre;
    const apellidoDestino = socio.apellido  || insc.apellido;

    try {
      await enviarEmailCancelacion({
        nombre:          nombreDestino,
        apellido:        apellidoDestino,
        email:           emailDestino,
        courseName:      course?.titulo ?? 'el curso',   // ← era title
        montoReembolso,
        moneda:          pago?.moneda ?? 'ARS',
      });
    } catch (mailErr) {
      console.error('[cancelarCurso] Error al enviar email:', mailErr.message);
    }

    return res.json({
      success: true,
      cancelado: true,
      reembolso: {
        aplica:     unDiaAntes && porcentajeReembolso > 0,
        porcentaje: porcentajeReembolso,
        monto:      montoReembolso,
        moneda:     pago?.moneda ?? 'ARS',
      },
      message:
        unDiaAntes && montoReembolso > 0
          ? `Inscripción cancelada. Se procesará un reembolso del 40 % (${montoReembolso}).`
          : 'Inscripción cancelada correctamente.',
    });
  } catch (err) {
    console.error('[cancelarCurso]', err);
    return res.status(500).json({ success: false, error: 'Error al cancelar la inscripción' });
  }
};