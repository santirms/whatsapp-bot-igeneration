const axios = require('axios');

const TIENDANUBE_ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;
const TIENDANUBE_STORE_ID = process.env.TIENDANUBE_STORE_ID;
const TIENDANUBE_API_URL = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}`;

// Headers para las requests
const headers = {
  'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
  'User-Agent': 'iGeneration WhatsApp Bot (contacto@igeneration.com.ar)',
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
    const products = response.data.map(product => {
      const variant = product.variants[0];
      
      // Usar promotional_price si existe, sino price
      const finalPrice = variant?.promotional_price || variant?.price || null;
      const originalPrice = variant?.price || null;
      const hasDiscount = variant?.promotional_price && parseFloat(variant.promotional_price) < parseFloat(variant.price);
      
      return {
        id: product.id,
        name: getSpanishText(product.name),
        description: getSpanishText(product.description),
        price: finalPrice,
        originalPrice: originalPrice,
        hasDiscount: hasDiscount,
        stock: variant?.stock || 0,
        sku: variant?.sku || null,
        available: product.has_stock !== false && (variant?.stock > 0 || variant?.stock === null),
        url: product.canonical_url,
        image: product.images[0]?.src || null,
        categories: product.categories?.map(c => getSpanishText(c.name)) || []
      };
    });

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

// Buscar productos por texto (más flexible)
async function searchProducts(query) {
  const products = await getProducts();
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);
  
  // Buscar en nombre, descripción y categorías
  const results = products.filter(product => {
    const nameLower = product.name?.toLowerCase() || '';
    const descLower = product.description?.toLowerCase() || '';
    const catsLower = product.categories?.join(' ').toLowerCase() || '';
    const allText = `${nameLower} ${descLower} ${catsLower}`;
    
    // Coincidencia si todas las palabras de la query están en el producto
    return queryWords.every(word => allText.includes(word));
  });

  return results;
}

// Obtener producto por nombre exacto o similar (búsqueda flexible)
async function findProduct(productName) {
  const products = await getProducts();
  const nameLower = productName.toLowerCase().trim();
  
  // 1. Buscar coincidencia exacta
  let product = products.find(p => p.name?.toLowerCase() === nameLower);
  if (product) return product;
  
  // 2. Buscar si el nombre del producto contiene la query
  product = products.find(p => p.name?.toLowerCase().includes(nameLower));
  if (product) return product;
  
  // 3. Buscar si la query contiene el nombre del producto
  product = products.find(p => nameLower.includes(p.name?.toLowerCase()));
  if (product) return product;
  
  // 4. Buscar por palabras clave (todas deben coincidir)
  const keywords = nameLower.split(/\s+/).filter(w => w.length > 2);
  if (keywords.length > 0) {
    product = products.find(p => {
      const pName = p.name?.toLowerCase() || '';
      return keywords.every(kw => pName.includes(kw));
    });
    if (product) return product;
  }
  
  // 5. Buscar por al menos una palabra clave importante
  const importantKeywords = keywords.filter(w => w.length > 3);
  if (importantKeywords.length > 0) {
    product = products.find(p => {
      const pName = p.name?.toLowerCase() || '';
      return importantKeywords.some(kw => pName.includes(kw));
    });
  }

  return product;
}

// Formatear precio argentino
function formatPrice(price) {
  if (!price) return 'Consultar';
  const num = parseFloat(price);
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Generar resumen del catálogo para el prompt de IA (con URLs y precios correctos)
async function getCatalogSummary() {
  const products = await getProducts();
  
  if (products.length === 0) {
    return 'No hay productos disponibles en este momento.';
  }

  const summary = products
    .filter(p => p.available)
    .map(p => {
      const priceText = formatPrice(p.price);
      const discountText = p.hasDiscount ? ` (antes ${formatPrice(p.originalPrice)})` : '';
      const url = p.url || '';
      return `- ${p.name}: ${priceText}${discountText} | Link: ${url}`;
    })
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
    price: formatPrice(product.price),
    url: product.url
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
