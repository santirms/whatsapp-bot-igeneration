const { sendMessage, markAsRead } = require('./whatsapp');
const { generateResponse, shouldHandoff, getHistory } = require('./ai');
const { notifyHandoff } = require('./notifications');

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
    
    // Obtener nombre del contacto si está disponible
    const contactName = value.contacts?.[0]?.profile?.name || null;

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

    console.log(`📩 Mensaje de ${from}${contactName ? ` (${contactName})` : ''}: ${messageBody}`);

    // Generar respuesta con IA
    const aiResponse = await generateResponse(from, messageBody);
    
    // Enviar respuesta
    await sendMessage(from, aiResponse);

    // Detectar si hubo handoff y notificar por Telegram
    if (shouldHandoff(aiResponse)) {
      console.log(`🚨 DERIVACIÓN A HUMANO - Usuario: ${from}`);
      
      // Obtener historial de la conversación
      const history = getHistory(from);
      
      // Determinar razón de la derivación
      let reason = 'Derivación solicitada';
      const responseLower = aiResponse.toLowerCase();
      if (responseLower.includes('reclamo') || responseLower.includes('problema')) {
        reason = 'Reclamo o problema con pedido';
      } else if (responseLower.includes('mercadolibre') || responseLower.includes('ml')) {
        reason = 'Consulta de MercadoLibre';
      } else if (responseLower.includes('técnic') || responseLower.includes('tecnic')) {
        reason = 'Consulta técnica';
      }
      
      // Enviar notificación a Telegram
      await notifyHandoff(from, contactName, history, reason);
    }

  } catch (error) {
    console.error('Error en handleIncomingMessage:', error);
  }
}

module.exports = {
  handleWebhookVerification,
  handleIncomingMessage
};
