# WhatsApp Bot - iGeneration

Bot de WhatsApp para tienda de gadgets y electrónicos.

## 🚀 Setup rápido

### 1. Clonar e instalar

```bash
git clone https://github.com/TU_USUARIO/whatsapp-bot-igeneration.git
cd whatsapp-bot-igeneration
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Meta.

### 3. Correr local

```bash
npm run dev
```

## 📱 Configuración en Meta for Developers

### Paso 1: Ir a tu App

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Ir a "My Apps" → Seleccionar tu app existente
3. En el menú lateral, ir a **WhatsApp** → **Configuration**

### Paso 2: Configurar Webhook

1. En la sección "Webhook", click en **Edit**
2. **Callback URL**: `https://TU-APP.onrender.com/webhook`
3. **Verify token**: El mismo que pusiste en `VERIFY_TOKEN` en Render
4. Click **Verify and save**

### Paso 3: Suscribirse a eventos

1. En "Webhook fields", asegurarte de tener marcado:
   - `messages` ✅

### Paso 4: Obtener credenciales

1. **PHONE_NUMBER_ID**: 
   - Ir a WhatsApp → API Setup
   - Copiar el "Phone number ID"

2. **WHATSAPP_TOKEN**:
   - En API Setup, sección "Temporary access token"
   - Click "Generate" si expiró
   - ⚠️ Este token expira en 24hs (ver sección de token permanente abajo)

## 🌐 Deploy en Render

### 1. Crear nuevo Web Service

1. Ir a [render.com](https://render.com)
2. New → Web Service
3. Conectar tu repo de GitHub

### 2. Configuración

- **Name**: `whatsapp-bot-igeneration`
- **Region**: Oregon (o la más cercana)
- **Branch**: `main`
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Free (o Starter $7/mes para mejor uptime)

### 3. Variables de entorno

Agregar en "Environment":

| Key | Value |
|-----|-------|
| `PORT` | `3000` |
| `WHATSAPP_TOKEN` | `tu_token_de_meta` |
| `VERIFY_TOKEN` | `mi_token_secreto_123` |
| `PHONE_NUMBER_ID` | `tu_phone_number_id` |
| `NODE_ENV` | `production` |

### 4. Deploy

Click en "Create Web Service" y esperar el deploy.

## 🔑 Token permanente (importante)

El token temporal de Meta expira en 24hs. Para producción necesitás un token permanente:

1. Ir a Business Settings → System Users
2. Crear un System User (si no tenés)
3. Asignar permisos de WhatsApp
4. Generar token permanente
5. Actualizar `WHATSAPP_TOKEN` en Render

## 🧪 Testing

1. Ir a WhatsApp → API Setup en Meta
2. Agregar tu número de teléfono como "test number"
3. Enviar mensaje de prueba: `hola`
4. Verificar respuesta del bot

## 📁 Estructura

```
whatsapp-bot-igeneration/
├── src/
│   ├── server.js          # Express server
│   ├── bot.js             # Lógica del bot y router
│   ├── whatsapp.js        # Cliente WhatsApp API
│   └── flows/
│       └── gadgets.js     # Productos y respuestas específicas
├── package.json
├── .env.example
└── .gitignore
```

## ✨ Features

- ✅ Respuestas automáticas a consultas comunes
- ✅ Catálogo de productos con precios
- ✅ Info de envíos, pagos, garantía
- ✅ Derivación a humano cuando se traba
- ✅ Horarios y ubicación

## 🔧 Personalización

### Agregar/editar productos

Editar `src/flows/gadgets.js`:

```javascript
const PRODUCTOS = {
  'nuevo_producto': {
    nombre: 'Nombre del Producto',
    precio: 15000,
    stock: true,
    descripcion: 'Descripción corta'
  },
  // ...
};
```

### Editar respuestas

Editar `src/bot.js` en la función `routeMessage()`.

## 🚧 TODOs

- [ ] Conectar con Tienda Nube API para stock real
- [ ] Agregar notificaciones (Telegram/Email) cuando piden humano
- [ ] Implementar token permanente
- [ ] Agregar logs a MongoDB

## 📞 Soporte

Cualquier problema, abrir un issue en el repo.
