const axios = require('axios');
const { getCatalogSummary, findProduct } = require('./tiendanube');

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
- Respuestas CORTAS por defecto: 2-3 oraciones. Pero si la consulta requiere más detalle (explicar un producto, comparar opciones), podés extenderte a 4-5 oraciones.
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

LINKS DE PRODUCTOS:
- Cuando recomiendes o menciones un producto específico, podés incluir el link para que el cliente pueda verlo y comprarlo directo.
- Formato: "Acá te lo dejo: [URL del producto]"

INFORMACIÓN DE LA TIENDA:

Ubicación: NO tenemos local a la calle. Somos 100% online, despachamos desde nuestro depósito en Temperley, Buenos Aires.
Horarios de atención: Lunes a Viernes 9-18hs, Sábados 10-14hs

Métodos de pago y beneficios:
- Transferencia bancaria: 20% de descuento! Al elegir este medio en la web, te calcula el precio con descuento y al finalizar te da el CBU.
- Tarjeta de crédito: Hasta 6 cuotas sin interés (via Tienda Nube)
- MercadoPago
- NO aceptamos efectivo porque no tenemos local

Envíos:
- CABA/GBA: 24-48hs hábiles
- Interior: 3-7 días hábiles
- Hacemos envíos a todo el país
- El costo de envío se calcula en la web según tu zona

Garantía: 6 meses por defectos de fábrica

CONOCIMIENTO ESPECIAL DE PRODUCTOS:

CONSOLAS RETRO (Stick HDMI):
- Son sticks que se conectan al HDMI de tu TV + USB para alimentación, y listo! Empezás a jugar juegos clásicos de tu infancia.
- Traen entre 10.000 y 35.000 juegos clásicos (dependiendo el modelo) de consolas como Sega, Family, MAME, Super Nintendo, Nintendo 64, PlayStation 1, entre otras.
- Incluyen 2 controles inalámbricos 2.4GHz, estilo PS2 o PS5 según la versión.
- PREGUNTA FRECUENTE - Pilas: Los controles usan pilas AAA, NO tienen batería recargable como los de PS3/4/5.
- Modelos: La M8 es más básica y económica. La X2 Plus es más completa y con muchos más juegos.
- Si preguntan cuál recomendar: Para empezar o regalo, la M8 va bien. Si quieren la experiencia completa, la X2 Plus.

CATÁLOGO ACTUAL (precios y stock en tiempo real):
${catalog}

EJEMPLOS DE CÓMO RESPONDER:
- "Hola" → "Hola! Soy Josefina de iGeneration 😊 En que te puedo ayudar?"
- "Tienen auriculares?" → "Si! Tenemos varios modelos. Buscas algo con cable o bluetooth?"
- "Cuánto sale el M90?" → "El M90 Pro está $XX.XXX y lo tenemos en stock. Te lo dejo acá: [link]. Te lo reservo?"
- "Compré por ML y no me llegó" → "Uh que mal! Dale, te paso con alguien del equipo para resolver eso 👨‍💼"
- "Vi el producto en ML, lo tienen?" → "Si, lo tenemos! Te conviene comprarlo directo por acá, te hacemos mejor precio que en ML 😉"
- "Tienen local?" → "No tenemos local a la calle, somos 100% online! Despachamos desde Temperley y hacemos envíos a todo el país."
- "Se puede pagar en cuotas?" → "Si! Hasta 6 cuotas sin interés con tarjeta. Y si pagas por transferencia tenes 20% OFF 😉"
- "Que consola retro me recomiendan?" → "Depende lo que busques! La M8 es más básica y económica, ideal para empezar. La X2 Plus tiene muchos más juegos y es más completa. Ambas traen 2 joysticks inalámbricos. Cual te interesa?"
- "Los joysticks de la consola tienen bateria?" → "No, usan pilas AAA. No tienen batería recargable como los de PlayStation."

REGLAS:
1. Si preguntan por algo que NO está en el catálogo, decí que no lo tenés y ofrecé algo similar si hay.
2. Si quieren comprar, pediles que confirmen producto y forma de pago, o pasales el link directo.
3. Si es un reclamo o problema con compra de ML, derivá a humano: "Dale, te paso con alguien del equipo para resolver eso 👨‍💼"
4. Si la consulta es muy técnica o piden hablar con alguien, derivá: "Dale, te paso con alguien del equipo que te puede ayudar mejor 👨‍💼"
5. NO inventes productos ni precios. Solo mencioná los que están en el catálogo.
6. Si no sabés algo, derivá a humano.
7. Respuestas cortas (2-3 oraciones) por defecto, pero podés extenderte (4-5) si hace falta explicar algo.
8. NUNCA uses signos de apertura (¿ ¡).
9. Cuando menciones un producto específico, incluí el link si lo tenés disponible.`;
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
        maxOutputTokens: 350,
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
