const mongoose = require('mongoose');

const RegistroSchema = new mongoose.Schema({
  email: String,
  respostas: [String],
  resultado: String,
  data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Registro', RegistroSchema);
