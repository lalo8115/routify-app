# 🧹 TrapoApp v1.0

Aplicación web progresiva (PWA) Mobile-First para gestión de ventas en ruta de trapos industriales.

## 🚀 Stack Tecnológico

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend/Base de Datos:** Supabase (PostgreSQL)
- **Deployment:** Vercel
- **Mapas:** react-leaflet + Leaflet
- **Iconos:** lucide-react

## 📋 Características

### Pantalla 1: Inicio / Captura Rápida (GPS)
- 📍 Geolocalización automática del dispositivo
- 📊 Lista de clientes ordenados por distancia
- ⚡ Registro rápido de ventas con cálculo automático
- ❌ Registro de "No compró" con un botón
- ➕ Botón flotante (FAB) para crear clientes nuevos con GPS

### Pantalla 2: Directorio y CRM
- 🔍 Filtros por tipo de negocio
- 📈 Ordenamiento por días sin compra o deuda pendiente
- ☑️ Selección múltiple de clientes
- 💬 Envío masivo de WhatsApp con enlaces dinámicos

### Pantalla 3: Mapa de Exploración
- 🗺️ Mapa interactivo con Leaflet
- 📌 Pines dinámicos: verde (< 15 días) / rojo (> 15 días)
- ℹ️ Popup con información y acciones rápidas
- 🎯 Centro automático por GPS o ubicación predeterminada

## 📦 Instalación

### 1. Clonar el repositorio
```bash
cd TrapoApp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
```

**Para obtener estas credenciales:**
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea un nuevo proyecto (o usa uno existente)
3. Ve a `Settings` → `API`
4. Copia el `Project URL` y el `anon/public key`

### 4. Configurar la base de datos en Supabase

1. Abre tu proyecto en Supabase
2. Ve a `SQL Editor`
3. Abre el archivo `database/schema.sql` de este proyecto
4. Copia y pega TODO el contenido en el editor SQL de Supabase
5. Haz clic en `Run` para ejecutar el script

Esto creará:
- ✅ 3 Enums (tipos de negocio, resultado de visita, tipos de trapo)
- ✅ Tabla `clientes`
- ✅ Tabla `visitas`
- ✅ Vista `vista_metricas_clientes`
- ✅ Índices para optimizar consultas
- ✅ Políticas de seguridad (RLS)
- ✅ Triggers automáticos

### 5. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🌐 Deployment en Vercel

### Opción 1: Deploy desde la terminal

1. Instala Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Sigue las instrucciones y configura las variables de entorno cuando se soliciten.

### Opción 2: Deploy desde GitHub

1. Sube tu código a GitHub
2. Ve a [https://vercel.com](https://vercel.com)
3. Haz clic en "Import Project"
4. Selecciona tu repositorio
5. Agrega las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Haz clic en "Deploy"

## 📱 Instalación como PWA en móvil

### iOS (Safari)
1. Abre la app en Safari
2. Toca el botón de compartir
3. Selecciona "Agregar a pantalla de inicio"
4. Confirma

### Android (Chrome)
1. Abre la app en Chrome
2. Toca el menú (⋮)
3. Selecciona "Instalar aplicación" o "Agregar a pantalla de inicio"
4. Confirma

## 🗂️ Estructura del Proyecto

```
TrapoApp/
├── database/
│   └── schema.sql              # Script SQL para Supabase
├── public/
│   └── manifest.json           # Configuración PWA
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Layout principal
│   │   ├── page.tsx            # Pantalla 1: Inicio
│   │   ├── directorio/
│   │   │   └── page.tsx        # Pantalla 2: Directorio CRM
│   │   └── mapa/
│   │       └── page.tsx        # Pantalla 3: Mapa
│   ├── components/
│   │   ├── BottomNav.tsx       # Navegación inferior
│   │   ├── ClienteCard.tsx     # Tarjeta de cliente
│   │   ├── MapView.tsx         # Vista del mapa
│   │   ├── NuevoClienteModal.tsx
│   │   └── RegistroVentaModal.tsx
│   ├── lib/
│   │   ├── supabase.ts         # Cliente de Supabase
│   │   └── utils.ts            # Utilidades (cálculos, formatos)
│   └── types/
│       └── index.ts            # Tipos TypeScript
├── .env.local.example
├── package.json
└── README.md
```

## 🔧 Modelo de Datos

### Tabla: clientes
- `id` (UUID, PK)
- `nombre` (TEXT)
- `tipo_negocio` (ENUM)
- `celular` (TEXT) - Con prefijo +52
- `precio_sugerido` (DECIMAL)
- `latitud` / `longitud` (DECIMAL)
- `activo` (BOOLEAN)

### Tabla: visitas
- `id` (UUID, PK)
- `cliente_id` (UUID, FK)
- `resultado` (ENUM: Venta, No_Venta, Abono)
- `tipo_trapo` (ENUM)
- `precio_kilo_aplicado` (DECIMAL)
- `kilos_vendidos` (DECIMAL)
- `monto_total` (DECIMAL)
- `monto_pagado` (DECIMAL)
- `fecha` (TIMESTAMP)

### Vista: vista_metricas_clientes
Calcula dinámicamente:
- `total_kilos_comprados`
- `deuda_pendiente`
- `ultima_fecha_compra`
- `dias_desde_ultima_compra`

## 🎨 Optimizaciones Mobile-First

- ✅ Botones con área táctil mínima de 44x44px
- ✅ Texto con peso medio para mejor legibilidad bajo el sol
- ✅ Navegación con una mano (bottom navigation)
- ✅ Modales desde abajo con animaciones suaves
- ✅ Safe areas para dispositivos con notch
- ✅ Scrolling optimizado sin barras visibles

## 🐛 Solución de Problemas

### Error: "La geolocalización no funciona"
- Asegúrate de que el sitio esté sirviendo por HTTPS (Vercel lo hace automáticamente)
- Da permisos de ubicación al navegador

### Error: "Faltan las variables de entorno de Supabase"
- Verifica que el archivo `.env.local` exista en la raíz
- Verifica que las variables comiencen con `NEXT_PUBLIC_`
- Reinicia el servidor de desarrollo después de crear el archivo

### Error: "No se pueden cargar los clientes"
- Verifica que hayas ejecutado el script SQL en Supabase
- Revisa la consola del navegador para ver errores específicos
- Verifica que las políticas RLS estén configuradas correctamente

## 📝 Notas Importantes

1. **Permisos GPS:** La app solicitará permisos de ubicación al cargar. Esto es necesario para ordenar clientes por distancia y capturar coordenadas al crear nuevos clientes.

2. **WhatsApp:** La funcionalidad de WhatsApp abrirá nuevas pestañas del navegador. Algunos navegadores pueden bloquear popups, asegúrate de permitirlos.

3. **Base de Datos:** Los datos se almacenan en Supabase (PostgreSQL). La vista SQL mantiene la base de datos normalizada y calcula métricas en tiempo real.

4. **PWA:** Una vez instalada como PWA, la app funciona casi como una app nativa con icono en el home screen.

## 📄 Licencia

Este proyecto es privado y de uso personal.

---

Desarrollado por un Senior Full-Stack Developer 🚀
