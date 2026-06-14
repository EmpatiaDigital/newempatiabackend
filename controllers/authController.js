const jwt = require('jwt-simple');
const User = require('../models/User');
const Socio = require('../models/Socio');
const dotenv = require('dotenv');
dotenv.config();

const login = async (req, res) => {
  const { correo, password } = req.body;

  try {
    // 1. Buscar si es User
    const user = await User.findOne({ username: correo }).lean();
    let socio = null;

    if (user) {
      // Buscar el socio correspondiente por correo
      socio = await Socio.findOne({ correo: user.username });
      if (!socio) {
        console.log("User encontrado, pero no hay socio con ese correo:", correo);
        return res.status(400).json({ message: 'Usuario no tiene socio asociado' });
      }

      // Verificar contraseña
      const isMatch = await User.schema.methods.comparePassword.call(user, password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Contraseña incorrecta' });
      }

      const payload = {
        userId: user._id,
        role: user.role,
        username: user.username,
      };

      const token = jwt.encode(payload,"dsafSDf1ASDF3aDf211221af21sad2f1asd12");

      // Siempre devolver avatar desde socio
      const avatarUrl = (socio.avatar && socio.avatar.startsWith('http'))
        ? socio.avatar
        : (socio.avatar ? `http://localhost:5000/${socio.avatar}` : null);

      const responseData = {
        token,
        role: user.role,
        username: user.username,
        nombre: socio.nombre,
        active: socio.active,
        avatar: avatarUrl,
        _id: user._id,
      };

      return res.json(responseData);
    }

    // 2. Si no es User, buscamos directamente en Socio
    socio = await Socio.findOne({ correo });
    if (!socio) {
      return res.status(400).json({ message: 'Usuario o socio no encontrado' });
    }

    const isMatch = socio.comparePassword
      ? await Socio.schema.methods.comparePassword.call(socio, password)
      : password === socio.password;

    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    const payload = {
      userId: socio._id,
      role: 'socio',
      username: socio.correo,
    };

    const token = jwt.encode(payload, "dsafSDf1ASDF3aDf211221af21sad2f1asd12");

    const avatarUrl = (socio.avatar && socio.avatar.startsWith('http'))
      ? socio.avatar
      : (socio.avatar ? `http://localhost:5000${socio.avatar}` : null);

    const responseData = {
      token,
      role: 'socio',
      username: socio.correo,
      nombre: socio.nombre,
      avatar: avatarUrl,
      _id: socio._id,
    };

    return res.json(responseData);

  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = { login };
