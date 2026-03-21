const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Prompt del sistema con la personalidad y datos de la tienda
const SYSTEM_PROMPT = `Sos el asistente virtual de iGeneration, una tienda argentina de gadgets y electrónicos.

PERSONALIDAD:
- Respondé de forma amigable, natural y concisa (máximo 3-4 oraciones)
- Usá español argentino (vos, tenés, etc.)
- Podés usar emojis pero sin excederte
- Sé directo, la gente en WhatsApp no lee mucho

INFORMACIÓN DE LA TIENDA:

📍 Ubicación: Lomas de Zamora, Buenos Aires
🕐 Horarios: Lunes a Viernes 9-18hs, Sábados 10-14hs

💳 Métodos de pago:
- Transferencia bancaria (10% OFF)
- MercadoPago
- Efectivo (solo retiro)
- Tarjetas vía MercadoPago

📦 Envíos:
- CABA/GBA: 24-48hs
- Interior: 3-7 días hábiles
- Retiro gratis en Lomas de Zamora

🛡️ Garantía: 6 meses por defectos de fábrica

CATÁLOGO DE PRODUCTOS:
- M25 (Auriculares TWS): $12.000 - En stock
- Noga BTwins (Auriculares TWS): $8.500 - En stock
- Lenovo XT62 (Auriculares TWS): $9.000 - En stock
- M90 Pro (Auriculares con display LED): $11.000 - En stock
- Cargador rápido 20W USB-C: $5.000 - En stock
- Cable USB-C reforzado 1m: $2.500 - En stock
- Power Bank 10000mAh: $12.000 - En stock

REGLAS IMPORTANTES:
1. Si preguntan por un producto que NO está en el catálogo, decí que no lo tenés pero ofrecé alternativas similares
2. Si quieren comprar o hacer una reserva, deciles que te confirmen el producto y la forma de pago para coordinar
3. Si la consulta es muy específica, técnica, o piden hablar con una persona, respondé: "Te paso con una persona del equipo para ayudarte mejor 👨‍💼"
4. No inventes productos ni precios
5. Si te preguntan algo que no sabés, derivá a humano

Respondé SOLO el mensaje, sin explicaciones adicionales.`;

// Historial de conversaciones (en memoria, después podés pasar a MongoDB)
const conversationHistory = new Map();

// Obtener o crear historial de un usuario
function getHistory(userId) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  return conversationHistory.get(userId);
}

// Agregar mensaje al historial
function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  
  // Mantener solo los últimos 10 mensajes para no gastar tokens
  if (history.length > 10) {
    history.shift();
  }
}

// Generar respuesta con Gemini
async function generateResponse(userId, userMessage) {
  try {
    // Agregar mensaje del usuario al historial
    addToHistory(userId, 'user', userMessage);
    
    const history = getHistory(userId);
    
    // Construir el contenido para Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido, soy el asistente de iGeneration. ¿En qué puedo ayudarte?' }]
      },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    const response = await axios.post(GEMINI_URL, {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 300,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      console.error('Respuesta vacía de Gemini:', response.data);
      return 'Disculpá, no pude procesar tu mensaje. ¿Podés repetirlo?';
    }

    // Agregar respuesta al historial
    addToHistory(userId, 'assistant', aiResponse);
    
    return aiResponse;

  } catch (error) {
    console.error('Error en Gemini API:', error.response?.data || error.message);
    return 'Disculpá, tuve un problema técnico. ¿Podés repetir tu consulta?';
  }
}

// Limpiar historial de un usuario
function clearHistory(userId) {
  conversationHistory.delete(userId);
}

// Detectar si hay que derivar a humano
function shouldHandoff(response) {
  const handoffPhrases = [
    'te paso con',
    'te contacto con',
    'te derivo',
    'persona del equipo',
    'hablar con una persona',
    '👨‍💼'
  ];
  
  const responseLower = response.toLowerCase();
  return handoffPhrases.some(phrase => responseLower.includes(phrase));
}

module.exports = {
  generateResponse,
  clearHistory,
  shouldHandoff
};
