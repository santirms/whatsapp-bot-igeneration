const { sendMessage, markAsRead } = require('./whatsapp');
const { generateResponse, shouldHandoff } = require('./ai');

// Verificación del webhook
function handleWebhookVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verificado');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Verificación fallida');
    res.sendStatus(403);
  }
}

// Procesar mensajes entrantes
async function handleIncomingMessage(body) {
  try {
    // Validar que sea un mensaje
    if (!body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      return;
    }

    const value = body.entry[0].changes[0].value;
    const message = value.messages[0];
    const from = message.from;
    const messageId = message.id;
    const messageType = message.type;

    // Marcar como leído
    await markAsRead(messageId);

    // Obtener el texto según el tipo de mensaje
    let messageBody = '';
    
    if (messageType === 'text') {
      messageBody = message.text?.body?.trim() || '';
    } else if (messageType === 'interactive') {
      messageBody = message.interactive?.button_reply?.title?.trim() || '';
    } else {
      // Audio, imagen, etc
      await sendMessage(from, 'Por favor envíame un mensaje de texto para ayudarte mejor 😊');
      return;
    }

    if (!messageBody) return;

    console.log(`📩 Mensaje de ${from}: ${messageBody}`);

    // Generar respuesta con IA
    const aiResponse = await generateResponse(from, messageBody);
    
    // Enviar respuesta
    await sendMessage(from, aiResponse);

    // Detectar si hubo handoff
    if (shouldHandoff(aiResponse)) {
      console.log(`🚨 DERIVACIÓN A HUMANO - Usuario: ${from}`);
      // TODO: Acá podés agregar notificación por Telegram/Email
    }

  } catch (error) {
    console.error('Error en handleIncomingMessage:', error);
  }
}

module.exports = {
  handleWebhookVerification,
  handleIncomingMessage
};
