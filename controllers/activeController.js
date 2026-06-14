const User = require('../models/User');
const Socio = require('../models/Socio');

exports.activeUser = async (req, res) => {
  const userId = req.params.id;
  const { activo, hasta, tipo } = req.body; // tipo: 'user' o 'socio'

  try {
    const Model = tipo === 'socio' ? Socio : User;
    const updateData = {
      active: activo,
      freezeUntil: activo ? null : new Date(hasta)
    };

    await Model.findByIdAndUpdate(userId, updateData);
    res.status(200).json({ message: `${tipo} ${activo ? 'habilitado' : 'congelado'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getAllAccounts = async (req, res) => {
    try {
      const users = await User.find({});
      const socios = await Socio.find({});
  
      const combined = [
        ...users.map(u => ({ ...u.toObject(), tipo: 'user' })),
        ...socios.map(s => ({ ...s.toObject(), tipo: 'socio' }))
      ];
  
      res.status(200).json(combined);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  