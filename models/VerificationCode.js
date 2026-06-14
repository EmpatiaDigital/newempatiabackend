const mongoose = require('mongoose');

const VerificationCodeSchema = new mongoose.Schema({
  correo: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
