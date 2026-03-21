const { sendMessage, sendButtonMessage, markAsRead } = require('./whatsapp');
const { processGadgetQuery } = require('./flows/gadgets');

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
      messageBody = message.text?.body?.toLowerCase().trim() || '';
    } else if (messageType === 'interactive') {
      // Respuesta de botones
      messageBody = message.interactive?.button_reply?.title?.toLowerCase().trim() || '';
    } else {
      // Otros tipos de mensaje (audio, imagen, etc)
      await sendMessage(from, 'Por favor envíame un mensaje de texto para ayudarte mejor 😊');
      return;
    }

    console.log(`📩 Mensaje de ${from}: ${messageBody}`);

    // Procesar el mensaje
    await routeMessage(from, messageBody);

  } catch (error) {
    console.error('Error en handleIncomingMessage:', error);
  }
}

// Router de mensajes
async function routeMessage(from, text) {
  
  // ===== DERIVAR A HUMANO =====
  if (/humano|persona|operador|atencion|atención|asesor|vendedor|hablar con/i.test(text)) {
    await sendMessage(from,
      `👨‍💼 *¡Perfecto! Te contacto con una persona.*\n\n` +
      `Un asesor te va a responder a la brevedad.\n` +
      `⏰ Horario de atención: Lunes a Viernes 9 a 18hs\n\n` +
      `Mientras tanto, podés seguir preguntando y te respondo lo que pueda 🙂`
    );
    
    // TODO: Acá podrías agregar notificación por Telegram/Email
    console.log(`🚨 DERIVACIÓN A HUMANO - Usuario: ${from}`);
    return;
  }

  // ===== SALUDOS =====
  if (/^(hola|buenos días|buenas tardes|buenas noches|hey|hi|que tal|qué tal)/i.test(text)) {
    await sendMessage(from, 
      `¡Hola! 👋 Bienvenido a *iGeneration*\n\n` +
      `Somos tu tienda de gadgets y electrónicos.\n\n` +
      `Puedo ayudarte con:\n` +
      `📦 Ver productos y precios\n` +
      `📍 Info de envíos\n` +
      `💳 Métodos de pago\n` +
      `🛡️ Garantías\n\n` +
      `¿Qué te gustaría saber?`
    );
    return;
  }

  // ===== CATÁLOGO / PRODUCTOS =====
  if (/catalogo|catálogo|productos|que tienen|qué tienen|que venden|qué venden|ver productos/i.test(text)) {
    await sendMessage(from,
      `📱 *Nuestros productos:*\n\n` +
      `🎧 Auriculares y audio\n` +
      `   • M25 - $12.000\n` +
      `   • Noga BTwins - $8.500\n` +
      `   • Lenovo XT62 - $9.000\n` +
      `   • M90 Pro - $11.000\n\n` +
      `🔌 Cargadores y cables\n` +
      `🔋 Power banks\n` +
      `🎮 Accesorios gaming\n\n` +
      `Decime qué producto te interesa y te paso más info 👆`
    );
    return;
  }

  // ===== ENVÍOS =====
  if (/envio|envíos|envios|envía|envían|despacho|entrega|cuanto tarda|cuánto tarda|llega|shipping/i.test(text)) {
    await sendMessage(from,
      `📦 *Información de envíos*\n\n` +
      `🚚 Hacemos envíos a todo el país\n\n` +
      `⏱️ *Tiempos de entrega:*\n` +
      `• CABA/GBA: 24-48hs\n` +
      `• Interior: 3-7 días hábiles\n\n` +
      `💰 *Costo:* Lo calculamos según tu zona\n\n` +
      `📍 *Retiro en persona:* Gratis en Lomas de Zamora\n\n` +
      `¿A qué zona necesitás el envío?`
    );
    return;
  }

  // ===== MÉTODOS DE PAGO =====
  if (/pago|pagas|abonar|aceptan|transferencia|mercadopago|mercado pago|efectivo|tarjeta|debito|débito|credito|crédito/i.test(text)) {
    await sendMessage(from,
      `💳 *Métodos de pago*\n\n` +
      `✅ Transferencia bancaria\n` +
      `✅ MercadoPago (link de pago)\n` +
      `✅ Efectivo (solo en retiro)\n` +
      `✅ Tarjeta de crédito/débito (vía MP)\n\n` +
      `💵 *10% OFF* pagando por transferencia\n\n` +
      `¿Querés que te pase los datos para transferir?`
    );
    return;
  }

  // ===== GARANTÍA =====
  if (/garantia|garantía|falla|fallo|defecto|roto|no funciona|no anda|problema/i.test(text)) {
    await sendMessage(from,
      `🛡️ *Garantía*\n\n` +
      `✅ Todos nuestros productos tienen garantía\n` +
      `⏰ 6 meses por defectos de fábrica\n` +
      `📋 Necesitás presentar el comprobante de compra\n\n` +
      `*No cubre:*\n` +
      `❌ Mal uso o golpes\n` +
      `❌ Daños por humedad\n` +
      `❌ Rotura de cables por tracción\n\n` +
      `¿Tenés algún problema con un producto?`
    );
    return;
  }

  // ===== FACTURA =====
  if (/factura|fiscal|monotributo|responsable inscripto|comprobante/i.test(text)) {
    await sendMessage(from,
      `📝 *Facturación*\n\n` +
      `✅ Emitimos factura B (consumidor final)\n` +
      `📧 Te la enviamos por WhatsApp o email\n\n` +
      `¿Necesitás factura para tu compra?`
    );
    return;
  }

  // ===== HORARIOS =====
  if (/horario|horarios|atienden|abierto|cerrado|hora|cuando|cuándo/i.test(text)) {
    await sendMessage(from,
      `🕐 *Horarios de atención*\n\n` +
      `📅 Lunes a Viernes: 9:00 a 18:00hs\n` +
      `📅 Sábados: 10:00 a 14:00hs\n` +
      `📅 Domingos: Cerrado\n\n` +
      `🤖 Este bot responde 24/7\n` +
      `👨‍💼 Consultas complejas las atendemos en horario comercial`
    );
    return;
  }

  // ===== UBICACIÓN =====
  if (/donde|dónde|ubicacion|ubicación|direccion|dirección|zona|local|retirar|retiro/i.test(text)) {
    await sendMessage(from,
      `📍 *Ubicación*\n\n` +
      `Estamos en Lomas de Zamora, Buenos Aires\n\n` +
      `🏠 Retiro en persona: Coordinamos día y horario\n` +
      `🚚 También hacemos envíos a todo el país\n\n` +
      `¿Querés coordinar un retiro?`
    );
    return;
  }

  // ===== STOCK / DISPONIBILIDAD =====
  if (/stock|disponible|tienen|tenes|tenés|hay/i.test(text)) {
    // Primero buscar si menciona algún producto específico
    const productResponse = processGadgetQuery(text);
    if (productResponse) {
      await sendMessage(from, productResponse);
      return;
    }
    
    // Si no menciona producto específico
    await sendMessage(from,
      `📦 ¿Qué producto te interesa?\n\n` +
      `Decime el nombre o modelo y te confirmo disponibilidad y precio 👍`
    );
    return;
  }

  // ===== CONSULTA DE PRODUCTOS ESPECÍFICOS =====
  const productResponse = processGadgetQuery(text);
  if (productResponse) {
    await sendMessage(from, productResponse);
    return;
  }

  // ===== AGRADECIMIENTOS =====
  if (/gracias|genial|excelente|perfecto|buenisimo|buenísimo|dale|ok|listo/i.test(text)) {
    await sendMessage(from,
      `¡De nada! 😊\n\n` +
      `Si tenés alguna otra consulta, acá estoy.\n` +
      `¡Que tengas un excelente día! 🙌`
    );
    return;
  }

  // ===== MENSAJE NO ENTENDIDO =====
  await sendMessage(from,
    `🤔 No estoy seguro de entender tu consulta.\n\n` +
    `Puedo ayudarte con:\n` +
    `• Productos y precios\n` +
    `• Envíos\n` +
    `• Formas de pago\n` +
    `• Garantía\n` +
    `• Horarios y ubicación\n\n` +
    `O escribí *"hablar con persona"* y te contacto con el equipo 👨‍💼`
  );
}

module.exports = {
  handleWebhookVerification,
  handleIncomingMessage
};
