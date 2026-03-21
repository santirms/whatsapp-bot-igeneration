const axios = require('axios');

const TIENDANUBE_ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;
const TIENDANUBE_STORE_ID = process.env.TIENDANUBE_STORE_ID;
const TIENDANUBE_API_URL = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}`;

// Headers para las requests
const headers = {
  'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
  'User-Agent': 'iGeneration WhatsApp Bot (santiagopetrei@gmail.com)',
  'Content-Type': 'application/json'
};

// Cache de productos (se actualiza cada 5 minutos)
let productCache = {
  products: [],
  lastUpdate: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Obtener todos los productos
async function getProducts(forceRefresh = false) {
  try {
    // Usar cache si es válido
    const now = Date.now();
    if (!forceRefresh && productCache.lastUpdate && (now - productCache.lastUpdate) < CACHE_DURATION) {
      return productCache.products;
    }

    console.log('📦 Actualizando catálogo desde Tienda Nube...');
    
    const response = await axios.get(`${TIENDANUBE_API_URL}/products`, {
      headers,
      params: {
        per_page: 100,
        published: true
      }
    });

    // Procesar productos
    const products = response.data.map(product => ({
      id: product.id,
      name: getSpanishText(product.name),
      description: getSpanishText(product.description),
      price: product.variants[0]?.price || null,
      compareAtPrice: product.variants[0]?.compare_at_price || null,
      stock: product.variants[0]?.stock || 0,
      sku: product.variants[0]?.sku || null,
      available: product.variants[0]?.stock > 0,
      url: product.canonical_url,
      image: product.images[0]?.src || null,
      categories: product.categories?.map(c => getSpanishText(c.name)) || []
    }));

    // Actualizar cache
    productCache = {
      products,
      lastUpdate: now
    };

    console.log(`✅ Catálogo actualizado: ${products.length} productos`);
    return products;

  } catch (error) {
    console.error('❌ Error obteniendo productos:', error.response?.data || error.message);
    // Devolver cache viejo si hay error
    return productCache.products;
  }
}

// Buscar productos por texto
async function searchProducts(query) {
  const products = await getProducts();
  const queryLower = query.toLowerCase();
  
  // Buscar en nombre, descripción y categorías
  const results = products.filter(product => {
    const nameMatch = product.name?.toLowerCase().includes(queryLower);
    const descMatch = product.description?.toLowerCase().includes(queryLower);
    const catMatch = product.categories?.some(c => c.toLowerCase().includes(queryLower));
    return nameMatch || descMatch || catMatch;
  });

  return results;
}

// Obtener producto por nombre exacto o similar
async function findProduct(productName) {
  const products = await getProducts();
  const nameLower = productName.toLowerCase();
  
  // Primero buscar coincidencia exacta
  let product = products.find(p => p.name?.toLowerCase() === nameLower);
  
  // Si no hay exacta, buscar parcial
  if (!product) {
    product = products.find(p => p.name?.toLowerCase().includes(nameLower));
  }
  
  // Si todavía no hay, buscar palabras clave
  if (!product) {
    const keywords = nameLower.split(' ');
    product = products.find(p => 
      keywords.some(kw => p.name?.toLowerCase().includes(kw))
    );
  }

  return product;
}

// Formatear precio argentino
function formatPrice(price) {
  if (!price) return 'Consultar';
  return `$${parseFloat(price).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

// Generar resumen del catálogo para el prompt de IA
async function getCatalogSummary() {
  const products = await getProducts();
  
  if (products.length === 0) {
    return 'No hay productos disponibles en este momento.';
  }

  const summary = products
    .filter(p => p.available)
    .map(p => `- ${p.name}: ${formatPrice(p.price)} ${p.stock > 0 ? '(En stock)' : '(Sin stock)'}`)
    .join('\n');

  return summary;
}

// Obtener texto en español de campos multiidioma
function getSpanishText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.es || field.en || Object.values(field)[0] || '';
}

// Verificar stock de un producto
async function checkStock(productName) {
  const product = await findProduct(productName);
  if (!product) return null;
  
  return {
    name: product.name,
    available: product.available,
    stock: product.stock,
    price: formatPrice(product.price)
  };
}

module.exports = {
  getProducts,
  searchProducts,
  findProduct,
  getCatalogSummary,
  checkStock,
  formatPrice
};
