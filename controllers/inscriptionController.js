const Inscription = require('../models/Inscription');
const Course = require('../models/Course');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "empatiadigital2025@gmail.com",
    pass: "nbnh gere gtos vors",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL DE BIENVENIDA
// Si se pasa codigoPromo, se agrega la sección del código en el mismo mail.
// ─────────────────────────────────────────────────────────────────────────────
const enviarEmailBienvenida = async (inscription, course, codigoPromo = null) => {

  const seccionCodigo = codigoPromo ? `
    <div style="margin: 24px 0; border: 2px dashed #f59e0b; border-radius: 10px; background-color: #fffbeb; padding: 20px; text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; color: #92400e;">
        🎉 ¡Felicitaciones! Fuiste seleccionado/a al azar para recibir un código promocional exclusivo
      </p>
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #78716c;">
        Entre todos los inscriptos al curso, ¡te tocó a vos!
      </p>
      <div style="display: inline-block; background-color: #fde68a; border-radius: 8px; padding: 10px 24px; border: 1.5px solid #f59e0b;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #92400e;">Tu código es:</p>
        <p style="margin: 0; font-size: 30px; font-weight: 900; color: #b45309; letter-spacing: 5px;">${codigoPromo}</p>
      </div>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #92400e;">
        Presentá este código al momento de abonar. Es <strong>único y personal</strong>, no lo compartas.
      </p>
    </div>
  ` : '';

  const mailOptions = {
    from: '"Empatía Digital" <empatiadigital2025@gmail.com>',
    to: inscription.email,
    subject: `¡Gracias por tu interés en ${course.titulo}!`,
    html: `
    <div style="font-family: 'Arial', sans-serif; color: #333; background-color: #f9f9f9; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto; border: 1px solid #ddd;">
      <h2 style="color: #2c3e50; text-align: center;">¡Bienvenido/a a Empatía Digital!</h2>
      <p style="font-size: 16px; color: #555;">Hola <strong>${inscription.nombre} ${inscription.apellido}</strong>,</p>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        ¡Gracias por tu interés en nuestro curso <strong>${course.titulo}</strong>! 
        Estamos muy contentos de que quieras formar parte de esta experiencia de aprendizaje.
      </p>
      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="color: #27ae60; margin-top: 0;">Detalles de tu inscripción:</h3>
        <p style="margin: 5px 0; color: #555;"><strong>Curso:</strong> ${course.titulo}</p>
        <p style="margin: 5px 0; color: #555;"><strong>Turno preferido:</strong> ${inscription.turnoPreferido}</p>
        <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${inscription.email}</p>
        <p style="margin: 5px 0; color: #555;"><strong>Celular:</strong> ${inscription.celular}</p>
      </div>
      ${seccionCodigo}
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Para estar al tanto de todas las novedades, información actualizada del curso y conectar con otros participantes, 
        te invitamos a sumarte a nuestro grupo de WhatsApp:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://chat.whatsapp.com/BMAjGTfb00B5qGMBxehk7X?mode=gi_t" 
           style="background-color: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
          Sumate al grupo de WhatsApp ahora
        </a>
      </div>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        En breve nos pondremos en contacto contigo para brindarte más información sobre el curso.
      </p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-size: 13px; color: #777; text-align: center;">
        Si tenés alguna consulta, no dudes en contactarnos.
      </p>
      <p style="font-size: 12px; color: #aaa; margin-top: 20px; text-align: center;">
        Enviado automáticamente por Empatía Digital.
      </p>
    </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET INSCRIPCIONES BY CURSO
// ─────────────────────────────────────────────────────────────────────────────
exports.getInscripcionesByCurso = async (req, res) => {
  try {
    const { cursoId } = req.params;
    const inscripciones = await Inscription.find({ 
      courseId: cursoId,
      estado: { $ne: 'cancelado' }
    })
      .populate('courseId', 'titulo')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: inscripciones });
  } catch (error) {
    console.error('Error al obtener inscripciones:', error);
    res.status(500).json({ success: false, message: 'Error al obtener las inscripciones', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREAR INSCRIPCIÓN
// Si el curso tiene código promo activo, se sortea entre todos los inscriptos
// activos y se incluye el código en el mail de bienvenida del ganador.
// Solo ese user lo recibe. Luego el código se desactiva del curso.
// ─────────────────────────────────────────────────────────────────────────────
exports.crearInscripcion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { nombre, apellido, email, celular, turnoPreferido, aceptaTerminos, courseId } = req.body;

    const curso = await Course.findById(courseId).session(session);
    if (!curso) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    }

    if (!curso.activo) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'El curso no está disponible para inscripciones' });
    }

    if (curso.cuposDisponibles <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'No hay cupos disponibles para este curso' });
    }

    const inscripcionExistente = await Inscription.findOne({ email, courseId }).session(session);
    if (inscripcionExistente) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Ya existe una inscripción con este email para este curso' });
    }

    const updatedCourse = await Course.findOneAndUpdate(
      { _id: courseId, cuposDisponibles: { $gt: 0 } },
      { $inc: { cuposDisponibles: -1 } },
      { new: true, session }
    );

    if (!updatedCourse) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'No hay cupos disponibles (otro usuario acaba de tomar el último cupo)' });
    }

    const nuevaInscripcion = new Inscription({
      nombre, apellido, email, celular, turnoPreferido, aceptaTerminos, courseId, estado: 'pendiente'
    });

    await nuevaInscripcion.save({ session });
    await session.commitTransaction();

    // ── Sorteo de código promo + envío de mails ──
    try {
      let codigoParaEsteUser = null;

      if (updatedCourse.tieneCodigoPromo && updatedCourse.codigoPromo) {
        // Obtenemos todas las inscripciones activas del curso (incluida la nueva)
        const inscripcionesActivas = await Inscription.find({
          courseId,
          estado: { $in: ['pendiente', 'confirmado'] }
        });

        // Sorteo aleatorio entre todas las inscripciones activas
        const ganadora = inscripcionesActivas[Math.floor(Math.random() * inscripcionesActivas.length)];
        const esElNuevo = ganadora.email === nuevaInscripcion.email;

        // Si el ganador es el nuevo inscripto, le pasamos el código en su mail de bienvenida
        if (esElNuevo) {
          codigoParaEsteUser = updatedCourse.codigoPromo;
        } else {
          // Si el ganador es un inscripto anterior, le reenviamos su mail de bienvenida con el código
          await enviarEmailBienvenida(ganadora, updatedCourse, updatedCourse.codigoPromo);
        }

        // Desactivamos el código para que no vuelva a sortearse
        await Course.findByIdAndUpdate(courseId, {
          tieneCodigoPromo: false,
          codigoPromo: null
        });

        console.log(`Código promo enviado a: ${ganadora.email}`);
      }

      // Mail de bienvenida del nuevo inscripto (con o sin código según sorteo)
      await enviarEmailBienvenida(nuevaInscripcion, updatedCourse, codigoParaEsteUser);

    } catch (emailError) {
      console.error('Error al enviar email de bienvenida:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Inscripción registrada exitosamente',
      data: nuevaInscripcion,
      cuposRestantes: updatedCourse.cuposDisponibles
    });

  } catch (error) {
    await session.abortTransaction();
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    console.error('Error en crearInscripcion:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la inscripción', error: error.message });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR ESTADO DE INSCRIPCIÓN
// ─────────────────────────────────────────────────────────────────────────────
exports.actualizarEstadoInscripcion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'confirmado', 'cancelado'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido. Debe ser: pendiente, confirmado o cancelado' });
    }

    const inscripcion = await Inscription.findById(id);
    if (!inscripcion) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada' });
    }

    const estadoAnterior = inscripcion.estado;
    inscripcion.estado = estado;
    await inscripcion.save();

    const curso = await Course.findById(inscripcion.courseId);
    if (curso) {
      const inscripcionesActivas = await Inscription.countDocuments({ 
        courseId: inscripcion.courseId, 
        estado: { $in: ['pendiente', 'confirmado'] }
      });
      curso.cuposDisponibles = curso.cuposTotal - inscripcionesActivas;
      await curso.save();
    }

    await inscripcion.populate('courseId', 'titulo');

    res.json({
      success: true,
      message: `Estado cambiado de ${estadoAnterior} a ${estado}`,
      data: inscripcion,
      cuposDisponibles: curso ? curso.cuposDisponibles : null
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR INSCRIPCIÓN
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelarInscripcion = async (req, res) => {
  try {
    const { id } = req.params;

    const inscripcion = await Inscription.findById(id);
    if (!inscripcion) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada' });
    }

    if (inscripcion.estado === 'cancelado') {
      return res.status(400).json({ success: false, message: 'Esta inscripción ya está cancelada' });
    }

    inscripcion.estado = 'cancelado';
    await inscripcion.save();

    const curso = await Course.findById(inscripcion.courseId);
    if (curso) {
      const inscripcionesActivas = await Inscription.countDocuments({ 
        courseId: inscripcion.courseId, 
        estado: { $in: ['pendiente', 'confirmado'] }
      });
      curso.cuposDisponibles = curso.cuposTotal - inscripcionesActivas;
      await curso.save();
    }

    res.json({
      success: true,
      message: 'Inscripción cancelada y cupo liberado',
      cuposLiberados: 1,
      cuposDisponibles: curso ? curso.cuposDisponibles : null
    });
  } catch (error) {
    console.error('Error al cancelar inscripción:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar inscripción', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ELIMINAR INSCRIPCIÓN
// ─────────────────────────────────────────────────────────────────────────────
exports.eliminarInscripcion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const inscripcion = await Inscription.findById(id).session(session);
    if (!inscripcion) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada' });
    }

    const cursoId = inscripcion.courseId;
    const estadoAnterior = inscripcion.estado;

    await Inscription.findByIdAndDelete(id).session(session);

    if (estadoAnterior === 'pendiente' || estadoAnterior === 'confirmado') {
      await Course.findByIdAndUpdate(
        cursoId,
        { $inc: { cuposDisponibles: 1 } },
        { session }
      );
    }

    await session.commitTransaction();
    res.json({ success: true, message: 'Inscripción eliminada exitosamente y cupo liberado' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al eliminar inscripción:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar inscripción', error: error.message });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET INSCRIPCIÓN BY ID
// ─────────────────────────────────────────────────────────────────────────────
exports.getInscripcionById = async (req, res) => {
  try {
    const { id } = req.params;
    const inscripcion = await Inscription.findById(id)
      .populate('courseId', 'titulo cuposTotal cuposDisponibles');
    if (!inscripcion) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada' });
    }
    res.json({ success: true, data: inscripcion });
  } catch (error) {
    console.error('Error al obtener inscripción:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la inscripción', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR INSCRIPCIÓN
// ─────────────────────────────────────────────────────────────────────────────
exports.actualizarInscripcion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, celular, turnoPreferido, notas } = req.body;

    const inscripcion = await Inscription.findByIdAndUpdate(
      id,
      { nombre, apellido, email, celular, turnoPreferido, notas },
      { new: true, runValidators: true }
    ).populate('courseId', 'titulo');

    if (!inscripcion) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada' });
    }

    res.json({ success: true, message: 'Inscripción actualizada exitosamente', data: inscripcion });
  } catch (error) {
    console.error('Error al actualizar inscripción:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar la inscripción', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS DEL CURSO
// ─────────────────────────────────────────────────────────────────────────────
exports.getEstadisticasCurso = async (req, res) => {
  try {
    const { cursoId } = req.params;

    const totalInscripciones = await Inscription.countDocuments({ courseId: cursoId });
    const confirmados = await Inscription.countDocuments({ courseId: cursoId, estado: 'confirmado' });
    const pendientes  = await Inscription.countDocuments({ courseId: cursoId, estado: 'pendiente' });
    const cancelados  = await Inscription.countDocuments({ courseId: cursoId, estado: 'cancelado' });
    const activos = confirmados + pendientes;

    // Acepta tanto 'mañana' como 'manana' por si el frontend envió sin tilde
    const turnoManana = await Inscription.countDocuments({ 
      courseId: cursoId, 
      turnoPreferido: { $in: ['mañana', 'manana'] },
      estado: { $in: ['pendiente', 'confirmado'] }
    });
    const turnoTarde = await Inscription.countDocuments({ 
      courseId: cursoId, 
      turnoPreferido: 'tarde',
      estado: { $in: ['pendiente', 'confirmado'] }
    });
    const turnoIndistinto = await Inscription.countDocuments({ 
      courseId: cursoId, 
      turnoPreferido: 'indistinto',
      estado: { $in: ['pendiente', 'confirmado'] }
    });

    const curso = await Course.findById(cursoId);

    const cuposTotal      = curso ? curso.cuposTotal : 0;
    const cuposDisponibles = curso ? Math.max(0, cuposTotal - activos) : 0;

    res.json({
      success: true,
      data: {
        totalInscripciones,
        activos,
        confirmados,
        pendientes,
        cancelados,
        cuposTotal,
        cuposDisponibles,
        porTurno: {
          manana: turnoManana,
          tarde: turnoTarde,
          indistinto: turnoIndistinto
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZAR CUPOS
// ─────────────────────────────────────────────────────────────────────────────
exports.sincronizarCupos = async (req, res) => {
  try {
    const { cursoId } = req.params;

    const curso = await Course.findById(cursoId);
    if (!curso) {
      return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    }

    const inscripcionesActivas = await Inscription.countDocuments({ 
      courseId: cursoId,
      estado: { $in: ['pendiente', 'confirmado'] }
    });

    curso.cuposDisponibles = curso.cuposTotal - inscripcionesActivas;
    await curso.save();

    res.json({
      success: true,
      message: 'Cupos sincronizados correctamente',
      data: {
        cuposTotal: curso.cuposTotal,
        inscripcionesActivas,
        cuposDisponibles: curso.cuposDisponibles
      }
    });
  } catch (error) {
    console.error('Error al sincronizar cupos:', error);
    res.status(500).json({ success: false, message: 'Error al sincronizar cupos', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE COMPATIBILIDAD CON ROUTES EXISTENTES
// ─────────────────────────────────────────────────────────────────────────────

exports.getAllInscriptions = async (req, res) => {
  try {
    const { courseId, estado, search } = req.query;
    let query = {};
    if (courseId) query.courseId = courseId;
    if (estado)   query.estado   = estado;
    if (search) {
      query.$or = [
        { nombre:   { $regex: search, $options: 'i' } },
        { apellido: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
        { celular:  { $regex: search, $options: 'i' } }
      ];
    }
    const inscriptions = await Inscription.find(query)
      .populate('courseId', 'titulo')
      .sort({ createdAt: -1 });
    res.json(inscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener inscripciones', error: error.message });
  }
};

exports.createInscription = async (req, res) => {
  return exports.crearInscripcion(req, res);
};

exports.getInscriptionById = async (req, res) => {
  return exports.getInscripcionById(req, res);
};

exports.updateInscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas } = req.body;

    const inscripcion = await Inscription.findByIdAndUpdate(
      id,
      { estado, notas },
      { new: true, runValidators: true }
    ).populate('courseId');

    if (!inscripcion) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }

    const curso = await Course.findById(inscripcion.courseId);
    if (curso) {
      const inscripcionesActivas = await Inscription.countDocuments({ 
        courseId: inscripcion.courseId,
        estado: { $in: ['pendiente', 'confirmado'] }
      });
      curso.cuposDisponibles = curso.cuposTotal - inscripcionesActivas;
      await curso.save();
    }

    res.json({ message: 'Estado actualizado exitosamente', inscription: inscripcion });
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar inscripción', error: error.message });
  }
};

exports.updateInscription = async (req, res) => {
  return exports.actualizarInscripcion(req, res);
};

exports.deleteInscription = async (req, res) => {
  return exports.eliminarInscripcion(req, res);
};

exports.getStatistics = async (req, res) => {
  try {
    const { courseId } = req.query;
    let matchQuery = {};
    if (courseId) {
      matchQuery.courseId = new mongoose.Types.ObjectId(courseId);
    }

    const stats = await Inscription.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total:           { $sum: 1 },
          pendientes:      { $sum: { $cond: [{ $eq: ['$estado', 'pendiente']  }, 1, 0] } },
          confirmados:     { $sum: { $cond: [{ $eq: ['$estado', 'confirmado'] }, 1, 0] } },
          cancelados:      { $sum: { $cond: [{ $eq: ['$estado', 'cancelado']  }, 1, 0] } },
          turnoManana:     { $sum: { $cond: [{ $in: ['$turnoPreferido', ['mañana', 'manana']] }, 1, 0] } },
          turnoTarde:      { $sum: { $cond: [{ $eq: ['$turnoPreferido', 'tarde']      }, 1, 0] } },
          turnoIndistinto: { $sum: { $cond: [{ $eq: ['$turnoPreferido', 'indistinto'] }, 1, 0] } }
        }
      }
    ]);

    const statistics = stats.length > 0 ? stats[0] : {
      total: 0, pendientes: 0, confirmados: 0, cancelados: 0,
      turnoManana: 0, turnoTarde: 0, turnoIndistinto: 0
    };

    delete statistics._id;
    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};
