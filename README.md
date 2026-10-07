# Stashly

> Guardar para comprar - Wishlist elegante con estética oscura premium

Stashly es una aplicación web completa para guardar productos que quieres comprar. Con diseño oscuro elegante, animaciones fluidas, organización por carpetas, historial de precios y más.

## Características

- **Añadir por URL** - Extrae automáticamente imagen, título, precio y tienda usando scraping server-side (sin APIs externas)
- **Organización** - Carpetas/colecciones con drag & drop, favoritos, comprados
- **Gestión completa** - Notas, precio objetivo, historial de precios, detección de duplicados
- **Papelera** - Soft delete con restauración
- **Selección múltiple** - Acciones masivas
- **Exportar/Importar** - Backup completo en JSON
- **Autenticación propia** - Registro/login con sesiones httpOnly, SQLite
- **Sincronización** - Todos los datos guardados en servidor autocontenido
- **Animaciones premium** - Transiciones, microinteracciones, skeleton loaders
- **Responsive** - Funciona en móvil, tablet y desktop

## Modo elegido

**Fullstack autocontenido (Opción A)** con:
- **Frontend:** Vite + TypeScript + Vue 3 (Composition API) + Pinia + Tailwind CSS v4 + vue-router
- **Backend:** Express + SQLite (better-sqlite3) en mismo repo
- **Auth:** Propio con bcrypt + sesiones httpOnly
- **Scraping:** Server-side con Cheerio (sin servicios terceros)
- **Animaciones:** @vueuse/motion + transiciones CSS

**Justificación:** Cumple con "TODO junto, sin depender de APIs externas". Permite autenticación, sincronización entre sesiones, scraping sin CORS, todo desde un solo proceso.

## Tecnologías

- **Vue 3** - Framework reactivo con Composition API
- **TypeScript** - Tipado estricto
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS v4** - Estilos utility-first
- **Pinia** - State management
- **Vue Router** - Navegación
- **@vueuse/motion** - Animaciones
- **@vueuse/core** - Utilidades
- **lucide-vue-next** - Iconos
- **vue-sonner** - Toasts animados
- **vuedraggable** - Drag & drop
- **Express** - Backend
- **better-sqlite3** - Base de datos SQLite
- **bcrypt** - Hash de contraseñas
- **cheerio** - Scraping HTML
- **uuid** - IDs únicos

## Instalación y ejecución

### Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (frontend + backend con hot reload)
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) (Vite dev server con proxy al backend en :3000)

### Producción

```bash
# Construir frontend
npm run build

# Ejecutar servidor (sirve frontend + API)
npm start
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura

```
stashly/
├── client/src/          # Frontend Vue
│   ├── components/      # Componentes reutilizables
│   ├── layouts/         # Layouts
│   ├── router/          # Rutas
│   ├── stores/          # Pinia stores
│   ├── views/           # Páginas
│   ├── api.ts           # Cliente API
│   └── types.ts         # Tipos TypeScript
├── server/              # Backend Express
│   ├── lib/             # DB, auth, scraper
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes
│   └── index.js         # Servidor
├── data/                # SQLite DB (se crea automáticamente)
└── dist/                # Build de producción
```

## Cómo añadir soporte para más tiendas

El scraper está en `server/lib/scraper.js`. Para mejorar soporte:

1. **Añadir selectores CSS** en el array `priceSelectors`
2. **Añadir lógica específica** para dominios concretos
3. **Mejorar extracción de JSON-LD** si es necesario
4. **Añadir soporte para más meta tags**

El sistema es extensible y prioriza JSON-LD Product, luego Open Graph, luego selectores comunes.

## Roadmap breve

- [ ] Drag & drop completo entre carpetas con animaciones
- [ ] Atajos de teclado globales
- [ ] Modo claro/oscuro toggle
- [ ] Notificaciones de bajada de precio
- [ ] PWA para uso offline
- [ ] Compartir listas
- [ ] Más integraciones de tiendas
- [ ] Exportar a CSV

## Paleta de colores

| Color | Uso |
|---|---|
| `#0f1117` | Fondo principal |
| `#151823` | Superficies/Sidebar |
| `#1a1f2e` | Tarjetas |
| `#2a2f42` | Bordes |
| `#9db4ff` | Acento primario |
| `#b8a6ff` | Acento secundario |
| `#86efac` | Éxito/Comprado |
| `#f87171` | Peligro |
| `#f9a8d4` | Favorito |

## Notas

- Sin APIs externas - Todo autocontenido
- Contraseñas hasheadas con bcrypt (12 rounds)
- Sesiones httpOnly secure
- Validación de URLs
- Detección de duplicados
- Historial de precios automático
- Animaciones optimizadas con transform/opacity
- Accesible con focus states

**Hecho con ❤️ para guardar con estilo**
