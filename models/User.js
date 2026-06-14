const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Esquema del usuario
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["socio", "admin", "superadmin"],
    required: true,
  },
  active: { type: Boolean, default: true },
  freezeUntil: { type: Date, default: null },
  socioId: { type: mongoose.Schema.Types.ObjectId, ref: "Socio" } 
});

// Middleware: antes de guardar, hashea la contraseña si fue modificada
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
