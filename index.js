const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const OpenAI = require('openai');

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const Registro = require('./models/Registro');

// Conexão com o MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar MongoDB:', err));

// Instância da OpenAI (versão nova)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rota principal da API
app.post('/api/quiz', async (req, res) => {
  const { email, respostas } = req.body;

  // Verifica se o email já usou a versão gratuita
  const existente = await Registro.findOne({ email });
  if (existente) {
    return res.status(400).json({ erro: 'Este email já usou a versão gratuita.' });
  }

  // Prompt enviado à IA
  const prompt = `
Baseado nas seguintes respostas:
1. ${respostas[0]}
2. ${respostas[1]}
3. ${respostas[2]}

Gere um breve diagnóstico de marca, uma missão, uma visão, 3 valores e uma proposta única de valor (PUV).
Use linguagem clara e amigável. Limite o total a 600 caracteres.
  `;

  try {
    const resposta = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600
    });

    const resultado = resposta.choices[0].message.content;

    // Envio por email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: '"Diagnóstico de Marca" <noreply@diagnostico.com>',
      to: email,
      subject: 'Seu Diagnóstico de Marca',
      text: resultado
    });

    // Salva no banco
    await Registro.create({ email, respostas, resultado });

    res.status(200).json({ sucesso: true });
  } catch (error) {
    console.error('Erro na geração ou envio:', error.message);
    res.status(500).json({ erro: 'Erro ao gerar o diagnóstico.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
