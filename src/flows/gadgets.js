// Base de productos de ejemplo
// TODO: Conectar con Tienda Nube API para stock/precios reales
const PRODUCTOS = {
  'auriculares': {
    nombre: 'Auriculares Bluetooth',
    precio: 15000,
    stock: true,
    descripcion: 'Auriculares inalámbricos con estuche de carga'
  },
  'm25': {
    nombre: 'M25',
    precio: 12000,
    stock: true,
    descripcion: 'Auriculares M25 con cancelación de ruido'
  },
  'noga': {
    nombre: 'Noga BTwins',
    precio: 8500,
    stock: true,
    descripcion: 'Auriculares TWS Noga BTwins'
  },
  'lenovo': {
    nombre: 'Lenovo XT62',
    precio: 9000,
    stock: true,
    descripcion: 'Auriculares Lenovo XT62 TWS'
  },
  'm90': {
    nombre: 'M90 Pro',
    precio: 11000,
    stock: true,
    descripcion: 'Auriculares M90 Pro con display LED'
  },
  'cargador': {
    nombre: 'Cargador rápido 20W',
    precio: 5000,
    stock: true,
    descripcion: 'Cargador USB-C carga rápida'
  },
  'cable': {
    nombre: 'Cable USB-C',
    precio: 2500,
    stock: true,
    descripcion: 'Cable USB-C reforzado 1 metro'
  },
  'powerbank': {
    nombre: 'Power Bank 10000mAh',
    precio: 12000,
    stock: true,
    descripcion: 'Batería portátil con doble USB'
  }
};

// Procesar consultas sobre productos
function processGadgetQuery(text) {
  const textLower = text.toLowerCase();
  
  // Buscar keywords de productos
  for (const [key, producto] of Object.entries(PRODUCTOS)) {
    if (textLower.includes(key)) {
      return formatProductInfo(producto);
    }
  }
  
  // Buscar por precio
  if (/precio|cuanto|cuesta|vale|sale/i.test(text)) {
    // Listar algunos productos con precios
    return `💰 *Algunos precios:*\n\n` +
           `• M25: $12.000\n` +
           `• Noga BTwins: $8.500\n` +
           `• Lenovo XT62: $9.000\n` +
           `• M90 Pro: $11.000\n\n` +
           `Decime qué producto te interesa y te paso más info 👆`;
  }
  
  return null;
}

// Formatear información del producto
function formatProductInfo(producto) {
  const stockText = producto.stock ? '✅ En stock' : '❌ Sin stock momentáneamente';
  
  return `📱 *${producto.nombre}*\n\n` +
         `${producto.descripcion}\n\n` +
         `💰 Precio: $${producto.precio.toLocaleString('es-AR')}\n` +
         `${stockText}\n\n` +
         `¿Querés más info o reservarlo?`;
}

// Actualizar stock (para usar cuando conectes con Tienda Nube)
function updateProductStock(key, inStock) {
  if (PRODUCTOS[key]) {
    PRODUCTOS[key].stock = inStock;
  }
}

// Actualizar precio
function updateProductPrice(key, newPrice) {
  if (PRODUCTOS[key]) {
    PRODUCTOS[key].precio = newPrice;
  }
}

module.exports = {
  processGadgetQuery,
  updateProductStock,
  updateProductPrice,
  PRODUCTOS
};
