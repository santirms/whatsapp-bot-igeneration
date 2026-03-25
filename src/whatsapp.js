const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

// Mostrar "escribiendo..." al usuario
async function sendTypingIndicator(to) {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'reaction',
        reaction: {
          message_id: '',
          emoji: ''
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    // Silenciar error - el typing indicator es opcional
  }
}

// Mostrar "escribiendo..." usando el endpoint correcto
async function showTyping(to) {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'typing',
        recipient_type: 'individual',
        to: to
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`⌨️ Typing indicator enviado a ${to}`);
  } catch (error) {
    // La API de Cloud no soporta typing de forma nativa en todas las versiones
    // Intentamos con el método alternativo
    try {
      await axios.post(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'contacts',
          contacts: [] // Truco: enviar contacts vacío a veces activa typing
        },
        {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (e) {
      // Silenciar - typing es opcional
    }
  }
}

// Enviar mensaje de texto
async function sendMessage(to, text) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Mensaje enviado a ${to}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
    throw error;
  }
}

// Enviar mensaje con botones interactivos
async function sendButtonMessage(to, bodyText, buttons) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map((btn, index) => ({
              type: 'reply',
              reply: {
                id: `btn_${index}`,
                title: btn
              }
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Mensaje con botones enviado a ${to}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando botones:', error.response?.data || error.message);
    throw error;
  }
}

// Marcar mensaje como leído
async function markAsRead(messageId) {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error marcando como leído:', error.response?.data || error.message);
  }
}

module.exports = {
  sendMessage,
  sendButtonMessage,
  markAsRead,
  showTyping
};
