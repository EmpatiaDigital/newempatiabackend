const Course = require('../models/Course');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Helper: normaliza los campos de cupos para que siempre estén en sync ──
const normalizarCupos = (body, existing = null) => {
  const result = { ...body };

  // El valor "fuente de verdad" es cuposDisponibles (el que edita el admin)
  const cuposNuevos = result.cuposDisponibles
    ?? existing?.cuposDisponibles
    ?? 30;

  // Siempre sincronizar los tres campos
  result.cuposDisponibles = cuposNuevos;
  result.cuposTotal       = cuposNuevos;   // campo viejo, mantener igual
  result.cuposTotales     = cuposNuevos;   // campo nuevo del schema

  return result;
};

// Obtener el curso activo
exports.getActiveCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ activo: true });
    if (!course) {
      return res.status(404).json({ message: 'No hay curso activo' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el curso', error: error.message });
  }
};

// Obtener todos los cursos (admin)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cursos', error: error.message });
  }
};

// Obtener un curso por ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el curso', error: error.message });
  }
};

// Crear un nuevo curso
exports.createCourse = async (req, res) => {
  try {
    const body = normalizarCupos(req.body);
    const course = new Course(body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el curso', error: error.message });
  }
};

// Actualizar curso — siempre sincroniza los tres campos de cupos
exports.updateCourse = async (req, res) => {
  try {
    const existing = await Course.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    const body = normalizarCupos(req.body, existing);

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );

    res.json(course);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el curso', error: error.message });
  }
};

// Subir imagen principal
exports.uploadMainImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No se proporcionó imagen' });
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'courses',
      resource_type: 'image'
    });

    const course = await Course.findByIdAndUpdate(
      id,
      { imagenPrincipal: uploadResponse.secure_url },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    res.json({
      message: 'Imagen subida exitosamente',
      imageUrl: uploadResponse.secure_url,
      course
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al subir imagen', error: error.message });
  }
};

// Obtener inscripciones de un curso
exports.getCourseEnrollments = async (req, res) => {
  try {
    const { id } = req.params;
    const Inscription = require('../models/Inscription');

    const enrollments = await Inscription.find({
      courseId: id,
      estado: { $ne: 'cancelado' }
    }).sort({ createdAt: -1 });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener inscripciones', error: error.message });
  }
};

// Agregar imagen a galería
exports.addGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No se proporcionó imagen' });
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'courses/gallery',
      resource_type: 'image'
    });

    const course = await Course.findByIdAndUpdate(
      id,
      {
        $push: {
          imagenesGaleria: {
            url: uploadResponse.secure_url,
            publicId: uploadResponse.public_id
          }
        }
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    res.json({ message: 'Imagen agregada a la galería', course });
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar imagen', error: error.message });
  }
};

// Eliminar imagen de galería
exports.deleteGalleryImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    const imageToDelete = course.imagenesGaleria.id(imageId);
    if (!imageToDelete) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }

    if (imageToDelete.publicId) {
      await cloudinary.uploader.destroy(imageToDelete.publicId);
    }

    course.imagenesGaleria.pull(imageId);
    await course.save();

    res.json({ message: 'Imagen eliminada', course });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar imagen', error: error.message });
  }
};

// Activar/desactivar curso
exports.toggleCourseStatus = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    if (!course.activo) {
      await Course.updateMany({ _id: { $ne: course._id } }, { activo: false });
    }

    course.activo = !course.activo;
    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
  }
};

// Eliminar curso
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    res.json({ message: 'Curso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar curso', error: error.message });
  }
};
