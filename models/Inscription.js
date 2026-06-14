const mongoose = require('mongoose');

const inscriptionSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor ingrese un email válido',
      ],
    },
    celular: {
      type: String,
      required: [true, 'El celular es obligatorio'],
      trim: true,
    },
    turnoPreferido: {
      type: String,
      enum: ['mañana', 'tarde', 'indistinto'],
      required: [true, 'Debe seleccionar un turno'],
    },
    aceptaTerminos: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: 'Debe aceptar los términos y condiciones',
      },
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    // Referencia al socio (opcional: permite inscriptos que no son socios)
    socioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Socio',
      default: null,
    },
    estado: {
      type: String,
      enum: ['pendiente', 'confirmado', 'cancelado'],
      default: 'pendiente',
    },
    notas: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

inscriptionSchema.index({ email: 1, courseId: 1 });
inscriptionSchema.index({ socioId: 1 });
inscriptionSchema.index({ estado: 1 });

module.exports = mongoose.model('Inscription', inscriptionSchema);