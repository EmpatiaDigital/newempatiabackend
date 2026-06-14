const mongoose = require('mongoose');

const cursoPagoSchema = new mongoose.Schema(
  {
    inscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inscription',
      required: true,
    },
    socioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Socio',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    monto: {
      type: Number,
      required: true,
    },
    moneda: {
      type: String,
      enum: ['ARS', 'USD'],
      default: 'ARS',
    },
    // Estado del pago del curso
    estadoPago: {
      type: String,
      enum: ['sin_pago', 'pendiente_comprobante', 'comprobante_enviado', 'pagado', 'rechazado'],
      default: 'sin_pago',
    },
    comprobanteUrl: {
      type: String,
      default: null,
    },
    fechaPago: {
      type: Date,
      default: null,
    },
    // Si hubo cancelación y reembolso parcial
    cancelado: {
      type: Boolean,
      default: false,
    },
    montoReembolso: {
      type: Number,
      default: null,
    },
    porcentajeReembolso: {
      type: Number,
      default: null, // 40 si se cancela un día antes
    },
    fechaCancelacion: {
      type: Date,
      default: null,
    },
    notas: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

cursoPagoSchema.index({ socioId: 1, courseId: 1 });
cursoPagoSchema.index({ inscriptionId: 1 });
cursoPagoSchema.index({ estadoPago: 1 });

module.exports = mongoose.model('CursoPago', cursoPagoSchema);