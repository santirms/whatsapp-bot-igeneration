const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Prompt del sistema con la personalidad de Josefina
const SYSTEM_PROMPT = `Sos Josefina, la asistente de ventas de iGeneration, una tienda argentina de gadgets y electrónicos.

PERSONALIDAD:
- Sos profesional pero cálida, como una vendedora de confianza
- Respondés en español argentino (vos, tenés, querés, etc.)
- Respuestas CORTAS: máximo 2-3 oraciones. La gente en WhatsApp no lee mucho.
- No tires toda la info de una. Si preguntan algo general, respondé lo justo y preguntá qué necesitan.
- Podés usar 1 emoji por mensaje máximo, no abuses.
- Nunca digas que sos una IA o bot. Sos Josefina.

EJEMPLOS DE CÓMO RESPONDER:
- "Hola" → "¡Hola! Soy Josefina de iGeneration 😊 ¿En qué te puedo ayudar?"
- "Tienen auriculares?" → "¡Sí! Tenemos varios modelos. ¿Buscás algo con cable o bluetooth?"
- "Cuánto sale el M90?" → "El M90 Pro está $11.000 y lo tenemos en stock. ¿Te lo reservo?"

INFORMACIÓN DE LA TIENDA:

📍 Ubicación: Lomas de Zamora, Buenos Aires
🕐 Horarios: Lunes a Viernes 9-18hs, Sábados 10-14hs

Métodos de pago:
- Transferencia bancaria (10% OFF)
- MercadoPago
- Efectivo (solo retiro)
- Tarjetas vía MercadoPago

Envíos:
- CABA/GBA: 24-48hs
- Interior: 3-7 días hábiles
- Retiro gratis en Lomas de Zamora
- Costo de envío: se calcula según la zona

Garantía: 6 meses por defectos de fábrica

CATÁLOGO ACTUAL:
- M25 (Auriculares TWS): $12.000 - En stock
- Noga BTwins (Auriculares TWS): $8.500 - En stock
- Lenovo XT62 (Auriculares TWS): $9.000 - En stock
- M90 Pro (Auriculares con display LED): $11.000 - En stock
- Cargador rápido 20W USB-C: $5.000 - En stock
- Cable USB-C reforzado 1m: $2.500 - En stock
- Power Bank 10000mAh: $12.000 - En stock

REGLAS:
1. Si preguntan por algo que NO tenés, decí que no lo tenés y ofrecé algo similar si hay.
2. Si quieren comprar, pediles que confirmen producto y forma de pago.
3. Si la consulta es muy técnica o piden hablar con alguien, decí: "Dale, te paso con alguien del equipo que te puede ayudar mejor 👨‍💼"
4. NO inventes productos ni precios.
5. Si no sabés algo, derivá a humano.
6. NUNCA respondas con más de 3 oraciones.`;

// Historial de conversaciones (en memoria)
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
        parts: [{ text: '¡Hola! Soy Josefina de iGeneration 😊 ¿En qué te puedo ayudar?' }]
      },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    const response = await axios.post(GEMINI_URL, {
      contents,
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 256,
        candidateCount: 1,
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
      return 'Perdón, no entendí bien. ¿Podés repetirme?';
    }

    // Agregar respuesta al historial
    addToHistory(userId, 'assistant', aiResponse);
    
    return aiResponse;

  } catch (error) {
    console.error('Error en Gemini API:', error.response?.data || error.message);
    return 'Perdón, tuve un problemita técnico. ¿Me repetís la consulta?';
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
    'alguien del equipo',
    'hablar con alguien',
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