require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { handleWebhookVerification, handleIncomingMessage } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'WhatsApp Bot - iGeneration',
    timestamp: new Date().toISOString()
  });
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  handleWebhookVerification(req, res);
});

// Webhook para recibir mensajes (POST)
app.post('/webhook', async (req, res) => {
  // Responder rápido a Meta (tienen timeout de 20s)
  res.sendStatus(200);
  
  // Procesar el mensaje en background
  try {
    await handleIncomingMessage(req.body);
  } catch (error) {
    console.error('Error procesando mensaje:', error);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📱 Bot de WhatsApp iGeneration listo`);
});
