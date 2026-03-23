const axios = require('axios');

// Configuración de Telegram (agregar en .env)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Envía una notificación por Telegram cuando hay derivación a humano
 * @param {string} customerPhone - Número del cliente (sin formato)
 * @param {string} customerName - Nombre del cliente si está disponible
 * @param {Array} conversationHistory - Historial de la conversación
 * @param {string} reason - Razón de la derivación
 */
async function notifyHandoff(customerPhone, customerName, conversationHistory, reason = 'Derivación solicitada') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️ Telegram no configurado. Derivación sin notificación.');
    return false;
  }

  try {
    // Formatear número para wa.me (sin + ni espacios)
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const waLink = `https://wa.me/${cleanPhone}`;
    
    // Generar resumen de la conversación (últimos 6 mensajes)
    const recentMessages = conversationHistory.slice(-6);
    const summary = recentMessages
      .map(msg => {
        const role = msg.role === 'user' ? '👤 Cliente' : '🤖 Josefina';
        let content = msg.content || '';
        // Truncar si es muy largo
        if (content.length > 150) {
          content = content.substring(0, 150) + '...';
        }
        // Escapar caracteres especiales de Markdown
        content = escapeMarkdown(content);
        return `${role}: ${content}`;
      })
      .join('\n\n');

    // Mensaje para Telegram (sin Markdown para evitar errores)
    const message = `🔔 DERIVACIÓN A HUMANO

📱 Cliente: ${customerName || 'Sin nombre'}
📞 WhatsApp: ${waLink}

📋 Motivo: ${reason}

💬 Resumen de conversación:
${summary || 'Sin historial disponible'}

⏰ ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`;

    // Enviar a Telegram SIN parse_mode para evitar errores
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      disable_web_page_preview: false
    });

    console.log(`✅ Notificación enviada a Telegram para ${cleanPhone}`);
    return true;

  } catch (error) {
    console.error('❌ Error enviando notificación Telegram:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Escapa caracteres especiales de Markdown
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/`/g, "'");
}

/**
 * Envía una notificación simple (sin derivación)
 * @param {string} message - Mensaje a enviar
 */
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️ Telegram no configurado.');
    return false;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    return true;
  } catch (error) {
    console.error('❌ Error enviando mensaje Telegram:', error.message);
    return false;
  }
}

module.exports = {
  notifyHandoff,
  sendTelegramMessage
};
