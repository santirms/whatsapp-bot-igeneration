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
 * Buscar orden por número de orden (el que ve el cliente, ej: 5554)
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

    // Buscar usando el parámetro q= que busca por number
    const response = await axios.get(`${TIENDANUBE_API_URL}/orders`, {
      headers,
      params: {
        q: cleanNumber
      }
    });

    // La API devuelve un array, tomamos la primera coincidencia exacta
    const orders = response.data;
    
    if (!orders || orders.length === 0) {
      console.log(`❌ Orden #${cleanNumber} no encontrada`);
      return null;
    }

    // Buscar coincidencia exacta por number
    const exactMatch = orders.find(o => String(o.number) === cleanNumber);
    
    if (exactMatch) {
      return parseOrder(exactMatch);
    }

    // Si no hay exacta, devolver la primera
    return parseOrder(orders[0]);

  } catch (error) {
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

  // Mapear estados de envío
  const shippingStatusMap = {
    'shipped': 'Enviado',
    'unshipped': 'Pendiente de envío',
    'partially_shipped': 'Envío parcial',
    'delivered': 'Entregado'
  };

  // Mapear estado general de la orden
  const orderStatusMap = {
    'open': 'Abierta',
    'closed': 'Cerrada',
    'cancelled': 'Cancelada'
  };

  // Estado del envío
  let shippingStatus = shippingStatusMap[order.shipping_status] || order.shipping_status || 'Pendiente';
  
  // Si está cancelada, mostrar eso
  if (order.status === 'cancelled') {
    shippingStatus = 'Orden cancelada';
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

  // Obtener tracking - puede estar en shipping_tracking_number o en fulfillments
  let trackingUrl = order.shipping_tracking_url || order.shipping_tracking_number || null;
  
  // Buscar en fulfillments si no está en el campo principal
  if (!trackingUrl && order.fulfillments?.length > 0) {
    const fulfillment = order.fulfillments[0];
    if (fulfillment.tracking_info?.url) {
      trackingUrl = fulfillment.tracking_info.url;
    } else if (fulfillment.tracking_info?.code) {
      trackingUrl = fulfillment.tracking_info.code;
    }
  }

  // Dirección de envío
  const shippingAddress = order.shipping_address || {};

  return {
    id: order.id,
    number: order.number,  // Este es el número que ve el cliente (#5554)
    date: formattedDate,
    customerName: order.contact_name,
    customerEmail: order.contact_email,
    customerPhone: order.contact_phone,
    
    // Estado
    status: orderStatusMap[order.status] || order.status,
    paymentStatus: paymentStatusMap[order.payment_status] || order.payment_status,
    paymentStatusRaw: order.payment_status,
    shippingStatus: shippingStatus,
    shippingStatusRaw: order.shipping_status,
    
    // Envío
    shippingMethod: order.shipping_option || 'No especificado',
    trackingNumber: order.shipping_tracking_number || null,
    trackingUrl: trackingUrl,
    shippingCity: shippingAddress.city || order.billing_city,
    shippingProvince: shippingAddress.province || order.billing_province,
    
    // Montos
    total: formatPrice(order.total),
    
    // Productos
    products: products,
    productsSummary: products.map(p => `${p.quantity}x ${p.name}`).join(', ') || 'Ver detalle en web',
    
    // Info adicional
    cancelReason: order.cancel_reason || null,
    cancelledAt: order.cancelled_at || null
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

  let summary = `Orden #${order.number} del ${order.date}\n`;
  summary += `Producto: ${order.productsSummary}\n`;
  summary += `Total: ${order.total}\n`;
  summary += `Estado del pago: ${order.paymentStatus}\n`;
  
  // Si está cancelada, mostrar eso claramente
  if (order.status === 'Cancelada') {
    summary += `Estado: CANCELADA`;
    if (order.paymentStatusRaw === 'refunded') {
      summary += ` (Reembolsado)`;
    }
    summary += `\n`;
  } else {
    summary += `Estado del envío: ${order.shippingStatus}\n`;
    
    if (order.trackingUrl && order.trackingUrl.startsWith('http')) {
      summary += `Link de seguimiento: ${order.trackingUrl}\n`;
    } else if (order.trackingNumber) {
      summary += `Código de seguimiento: ${order.trackingNumber}\n`;
    }
  }
  
  if (order.shippingCity || order.shippingProvince) {
    summary += `Destino: ${order.shippingCity || ''}, ${order.shippingProvince || ''}`;
  }

  return summary.trim();
}

module.exports = {
  findOrderByNumber,
  findOrdersByContact,
  findOrdersByWhatsApp,
  getOrderSummary
};
