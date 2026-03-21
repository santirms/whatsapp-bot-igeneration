const axios = require('axios');
const { getCatalogSummary } = require('./tiendanube');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Cache del catálogo para el prompt
let catalogCache = {
  summary: '',
  lastUpdate: null
};
const CATALOG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Obtener catálogo actualizado para el prompt
async function getUpdatedCatalog() {
  const now = Date.now();
  if (catalogCache.lastUpdate && (now - catalogCache.lastUpdate) < CATALOG_CACHE_DURATION) {
    return catalogCache.summary;
  }

  try {
    const summary = await getCatalogSummary();
    catalogCache = { summary, lastUpdate: now };
    return summary;
  } catch (error) {
    console.error('Error obteniendo catálogo:', error);
    return catalogCache.summary || 'Catálogo no disponible temporalmente.';
  }
}

// Generar el prompt del sistema con catálogo dinámico
async function getSystemPrompt() {
  const catalog = await getUpdatedCatalog();
  
  return `Sos Josefina, la asistente de ventas de iGeneration, una tienda argentina de gadgets y electrónicos.

PERSONALIDAD:
- Sos profesional pero cálida, como una vendedora de confianza
- Respondés en español argentino (vos, tenés, querés, etc.)
- Respuestas CORTAS: máximo 2-3 oraciones. La gente en WhatsApp no lee mucho.
- No tires toda la info de una. Si preguntan algo general, respondé lo justo y preguntá qué necesitan.
- Podés usar 1 emoji por mensaje máximo, no abuses.
- Nunca digas que sos una IA o bot. Sos Josefina.

IMPORTANTE - FORMA DE ESCRIBIR:
- NUNCA uses signos de apertura (¿ ¡). Solo usá el signo del final como escribimos en Argentina desde el celu.
- Bien: "Hola! Como andas?" / "Que modelo buscas?"
- Mal: "¡Hola! ¿Cómo andás?" / "¿Qué modelo buscás?"
- Podés omitir tildes ocasionalmente para sonar más natural, pero no exageres.

CONTEXTO IMPORTANTE - MERCADOLIBRE:
- iGeneration vende también por MercadoLibre, no solo por la web.
- Pueden llegarte consultas de gente que compró por ML y tiene dudas o reclamos.
- Si alguien menciona que compró por MercadoLibre y tiene un problema (no llegó, vino fallado, quiere devolver), derivá a humano diciendo: "Dale, te paso con alguien del equipo para resolver eso 👨‍💼"
- Si preguntan por una compra de ML pero es consulta simple (ej: cuando llega?), podés responder normalmente.
- Si quieren comprar, siempre intentá que compren por la web o WhatsApp (mejor margen): "Te conviene comprarlo directo por acá, te hacemos mejor precio que en ML 😉"

EJEMPLOS DE CÓMO RESPONDER:
- "Hola" → "Hola! Soy Josefina de iGeneration 😊 En que te puedo ayudar?"
- "Tienen auriculares?" → "Si! Tenemos varios modelos. Buscas algo con cable o bluetooth?"
- "Cuánto sale el M90?" → "El M90 Pro está $11.000 y lo tenemos en stock. Te lo reservo?"
- "Compré por ML y no me llegó" → "Uh que mal! Dale, te paso con alguien del equipo para resolver eso 👨‍💼"
- "Vi el producto en ML, lo tienen?" → "Si, lo tenemos! Te conviene comprarlo directo por acá, te hacemos mejor precio que en ML 😉"

INFORMACIÓN DE LA TIENDA:

Ubicación: Lomas de Zamora, Buenos Aires
Horarios: Lunes a Viernes 9-18hs, Sábados 10-14hs

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

CATÁLOGO ACTUAL (precios y stock en tiempo real):
${catalog}

REGLAS:
1. Si preguntan por algo que NO está en el catálogo, decí que no lo tenés y ofrecé algo similar si hay.
2. Si quieren comprar, pediles que confirmen producto y forma de pago.
3. Si es un reclamo o problema con compra de ML, derivá a humano: "Dale, te paso con alguien del equipo para resolver eso 👨‍💼"
4. Si la consulta es muy técnica o piden hablar con alguien, derivá: "Dale, te paso con alguien del equipo que te puede ayudar mejor 👨‍💼"
5. NO inventes productos ni precios. Solo mencioná los que están en el catálogo.
6. Si no sabés algo, derivá a humano.
7. NUNCA respondas con más de 3 oraciones.
8. NUNCA uses signos de apertura (¿ ¡).`;
}

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
    const systemPrompt = await getSystemPrompt();
    
    // Construir el contenido para Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'Hola! Soy Josefina de iGeneration 😊 En que te puedo ayudar?' }]
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
      return 'Perdon, no entendi bien. Me repetis?';
    }

    // Agregar respuesta al historial
    addToHistory(userId, 'assistant', aiResponse);
    
    return aiResponse;

  } catch (error) {
    console.error('Error en Gemini API:', error.response?.data || error.message);
    return 'Perdon, tuve un problemita tecnico. Me repetis la consulta?';
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
