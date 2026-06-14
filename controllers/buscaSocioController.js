
const Socio = require('../models/Socio');

exports.obtenerSocios = async (req, res) => {
    const correo = req.headers['correo'];  // Obtenemos el correo del header
  
    if (!correo) {
      return res.status(400).json({ message: 'Correo no proporcionado' });
    }
  
    try {
      const socio = await Socio.findOne({ correo: correo });
  
      if (!socio) {
        return res.status(404).json({ message: 'Socio no encontrado' });
      }
  
      return res.json({ success: true, socio });
    } catch (error) {
      console.error('Error al obtener los datos del socio:', error);
      return res.status(500).json({ message: 'Ocurrió un error al obtener los datos del socio' });
    }
  };


  // /controllers/testController.js
// exports.testRoute = (req, res) => {
//     // Aquí puedes agregar lógica si lo necesitas
//     res.json({ message: 'Ruta de prueba exitosa desde el controlador' });
//   };
  


// const Socio = require('../models/Socio');

// Obtener datos del socio por ID
// exports.obtenerSocios = async (req, res) => {
//   const { id } = req.params;  // Obtenemos el ID de los parámetros de la URL

//   if (!id) {
//     return res.status(400).json({ message: 'ID no proporcionado' });
//   }

//   try {
//     const socio = await Socio.findById(id);  // Buscamos al socio por su ID

//     if (!socio) {
//       return res.status(404).json({ message: 'Socio no encontrado' });
//     }

//     return res.json({ success: true, socio });
//   } catch (error) {
//     console.error('Error al obtener los datos del socio:', error);
//     return res.status(500).json({ message: 'Ocurrió un error al obtener los datos del socio' });
//   }
// };
