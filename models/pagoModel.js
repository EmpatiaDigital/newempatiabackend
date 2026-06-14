// models/pagoModel.js
// ─────────────────────────────────────────────────────────────────────────────
// Registra los comprobantes de pago enviados por los socios.
// El superadmin acepta o rechaza cada uno.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema(
  {
    socioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Socio',
      required: true,
    },
    mes: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    anio: {
      type: Number,
      required: true,
    },
    monto: {
      type: Number,
      required: true,
    },
    // URL segura del archivo en Cloudinary
    comprobanteUrl: {
      type: String,
      required: true,
    },
    // public_id de Cloudinary, necesario para borrar el archivo
    comprobantePublicId: {
      type: String,
      required: true,
    },
    // mimetype original (image/jpeg, application/pdf, etc.)
    comprobanteTipo: {
      type: String,
      default: 'image/jpeg',
    },
    // nombre original del archivo
    comprobanteNombre: {
      type: String,
      default: '',
    },
    /**
     * pendiente_comprobante  → cuota sin comprobante (no debería llegar aquí)
     * comprobante_enviado    → socio subió el comprobante; esperando revisión
     * aceptado               → superadmin aprobó el pago (marca la cuota como pagada)
     * rechazado              → superadmin rechazó el comprobante
     */
    estado: {
      type: String,
      enum: ['pendiente_comprobante', 'comprobante_enviado', 'aceptado', 'rechazado'],
      default: 'comprobante_enviado',
    },
    // Nota del administrador al aceptar o rechazar
    notaAdmin: {
      type: String,
      default: '',
    },
    // Fecha en que el admin tomó acción
    fechaAccion: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

pagoSchema.index({ socioId: 1, mes: 1, anio: 1 });

module.exports = mongoose.model('Pago', pagoSchema);