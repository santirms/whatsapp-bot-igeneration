const axios = require('axios');

const TIENDANUBE_ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;
const TIENDANUBE_STORE_ID = process.env.TIENDANUBE_STORE_ID;
const TIENDANUBE_API_URL = `https://api.tiendanube.com/v1/${TIENDANUBE_STORE_ID}`;

const headers = {
  'Authentication': `bearer ${TIENDANUBE_ACCESS_TOKEN}`,
  'User-Agent': 'iGeneration WhatsApp Bot (contacto@igeneration.com.ar)',
  'Content-Type': 'application/json'
};

/**
 * Buscar orden por número de orden
 * @param {string|number} orderNumber - Número de orden (puede venir con # o sin)
 */
async function findOrderByNumber(orderNumber) {
  try {
    // Limpiar el número (quitar #, espacios, etc)
    const cleanNumber = String(orderNumber).replace(/[^0-9]/g, '');
    
    if (!cleanNumber) {
      return null;
    }

    console.log(`🔍 Buscando orden #${cleanNumber}...`);

    // Buscar por ID directamente
    const response = await axios.get(`${TIENDANUBE_API_URL}/orders/${cleanNumber}`, {
      headers
    });

    return parseOrder(response.data);

  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`❌ Orden #${orderNumber} no encontrada`);
      return null;
    }
    console.error('Error buscando orden:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Buscar órdenes por email o teléfono del cliente
 * @param {string} contact - Email o teléfono
 */
async function findOrdersByContact(contact) {
  try {
    const cleanContact = contact.trim().toLowerCase();
    
    console.log(`🔍 Buscando órdenes para: ${cleanContact}...`);

    // Traer últimas órdenes y filtrar
    const response = await axios.get(`${TIENDANUBE_API_URL}/orders`, {
      headers,
      params: {
        per_page: 50,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    });

    const orders = response.data.filter(order => {
      const email = order.contact_email?.toLowerCase() || '';
      const phone = order.contact_phone?.replace(/\D/g, '') || '';
      const searchPhone = cleanContact.replace(/\D/g, '');
      
      return email.includes(cleanContact) || 
             phone.includes(searchPhone) ||
             searchPhone.includes(phone.slice(-8)); // Últimos 8 dígitos
    });

    return orders.map(parseOrder);

  } catch (error) {
    console.error('Error buscando órdenes por contacto:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Buscar órdenes recientes por número de WhatsApp
 * @param {string} whatsappNumber - Número de WhatsApp (formato: 5491123456789)
 */
async function findOrdersByWhatsApp(whatsappNumber) {
  try {
    // Limpiar número
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    // Tomar últimos 10 dígitos (sin código de país)
    const localNumber = cleanNumber.slice(-10);
    
    console.log(`🔍 Buscando órdenes para WhatsApp: ${localNumber}...`);

    const response = await axios.get(`${TIENDANUBE_API_URL}/orders`, {
      headers,
      params: {
        per_page: 30,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    });

    const orders = response.data.filter(order => {
      const phone = order.contact_phone?.replace(/\D/g, '') || '';
      const billingPhone = order.billing_phone?.replace(/\D/g, '') || '';
      
      return phone.includes(localNumber) || 
             localNumber.includes(phone.slice(-10)) ||
             billingPhone.includes(localNumber);
    });

    return orders.map(parseOrder);

  } catch (error) {
    console.error('Error buscando órdenes por WhatsApp:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Parsear orden a formato simplificado
 */
function parseOrder(order) {
  // Mapear estados de pago
  const paymentStatusMap = {
    'paid': 'Pagado',
    'pending': 'Pendiente de pago',
    'refunded': 'Reembolsado',
    'voided': 'Anulado',
    'abandoned': 'Abandonado'
  };

  // Mapear estados de fulfillment
  const fulfillmentStatusMap = {
    'fulfilled': 'Enviado',
    'unfulfilled': 'Pendiente de envío',
    'partial': 'Envío parcial',
    'shipped': 'En camino',
    'delivered': 'Entregado'
  };

  // Determinar estado del envío
  let shippingStatus = 'Pendiente de envío';
  if (order.fulfillment_status) {
    shippingStatus = fulfillmentStatusMap[order.fulfillment_status] || order.fulfillment_status;
  } else if (order.shipping_tracking_number) {
    shippingStatus = 'Enviado';
  }

  // Formatear fecha
  const createdDate = new Date(order.created_at);
  const formattedDate = createdDate.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Obtener productos
  const products = order.products?.map(p => ({
    name: p.name,
    quantity: p.quantity,
    price: p.price
  })) || [];

  return {
    id: order.id,
    number: order.number || order.id,
    date: formattedDate,
    customerName: order.contact_name,
    customerEmail: order.contact_email,
    customerPhone: order.contact_phone,
    
    // Estado
    paymentStatus: paymentStatusMap[order.payment_status] || order.payment_status,
    paymentStatusRaw: order.payment_status,
    shippingStatus: shippingStatus,
    
    // Envío
    shippingMethod: order.shipping_option || 'No especificado',
    trackingNumber: order.shipping_tracking_number || null,
    trackingUrl: order.shipping_tracking_url || order.shipping_tracking_number || null,
    shippingCity: order.shipping_address?.city || order.billing_city,
    shippingProvince: order.shipping_address?.province || order.billing_province,
    
    // Montos
    total: formatPrice(order.total),
    
    // Productos
    products: products,
    productsSummary: products.map(p => `${p.quantity}x ${p.name}`).join(', ') || 'Ver detalle en web'
  };
}

/**
 * Formatear precio argentino
 */
function formatPrice(price) {
  if (!price) return 'N/A';
  const num = parseFloat(price);
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Generar resumen de orden para respuesta de Josefina
 */
function getOrderSummary(order) {
  if (!order) return null;

  let summary = `Orden #${order.id} del ${order.date}\n`;
  summary += `Estado del pago: ${order.paymentStatus}\n`;
  summary += `Estado del envío: ${order.shippingStatus}\n`;
  
  if (order.trackingNumber) {
    // Si es URL de tracking
    if (order.trackingNumber.startsWith('http')) {
      summary += `Seguimiento: ${order.trackingNumber}\n`;
    } else {
      summary += `Código de seguimiento: ${order.trackingNumber}\n`;
    }
  }
  
  summary += `Destino: ${order.shippingCity || ''}, ${order.shippingProvince || ''}\n`;
  summary += `Total: ${order.total}`;

  return summary;
}

module.exports = {
  findOrderByNumber,
  findOrdersByContact,
  findOrdersByWhatsApp,
  getOrderSummary
};
