# Stashly

Wishlist editorial para guardar los productos que quieres comprar, organizarlos y decidir con calma.

**Demo en vivo:** [guigarmon3.github.io/stashly](https://guigarmon3.github.io/stashly/)

## Qué es

Stashly es una aplicación web para reunir en un solo lugar todo lo que te gusta o necesitas comprar. Pegas la URL de un producto y la app extrae su título, imagen, precio y tienda; después lo organizas en carpetas, lo marcas como favorito o comprado y sigues su precio a lo largo del tiempo.

Nació como una alternativa tranquila a las listas de deseos de las tiendas: una colección privada, con estética editorial, pensada para mirar antes de comprar y no al revés.

## Qué puedes hacer

- **Guardar productos por URL** con extracción automática de datos.
- **Organizar** en carpetas con colores, favoritos, comprados y papelera.
- **Anotar** notas personales y fijar un precio objetivo.
- **Seguir el precio** con historial y mínimo/máximo por producto.
- **Seleccionar varios** productos para moverlos, comprarlos o eliminarlos a la vez.
- **Buscar, filtrar y ordenar** por fecha, precio, título o tienda.
- **Exportar e importar** la colección completa en JSON.
- **Tener tu propia cuenta**: cada persona ve solo su lista, con sesiones privadas.

## Diseño

Interfaz de tonos cálidos, tipografía editorial y detalles de revista: una wishlist que se lee como un catálogo y se usa como una herramienta. El movimiento está medido, la web es responsive y respeta `prefers-reduced-motion`.

## Cómo está construido

- Vue 3 + TypeScript + Vite
- Tailwind CSS v4
- Pinia + Vue Router
- Express + SQLite (`node:sqlite`) en el mismo repositorio
- bcrypt para las contraseñas y sesiones httpOnly
- Cheerio para el scraping sin APIs externas
- @vueuse/motion para las animaciones

El frontend y la API viven en el mismo proyecto. El servidor gestiona cuentas, colecciones, productos, historial de precios y análisis de URLs; el cliente es una SPA que consume esa API.

## Demo pública

La demo de GitHub Pages es una **versión estática**: corre entera en el navegador y guarda los cambios en `localStorage`. Cada visitante crea su propia cuenta local, con contraseña hasheada, y ve solo sus datos: no hay una cuenta compartida. El scraping real, las cuentas sincronizadas entre dispositivos y la base de datos SQLite necesitan el servidor incluido en el repositorio.

## App completa en Cloudflare

La carpeta `worker/` contiene la misma API adaptada a Cloudflare Workers, con D1 como base de datos. Sirve la SPA y la API desde el mismo dominio, de modo que las sesiones funcionan sin depender de cookies entre sitios.

```bash
npm run build
npx wrangler login
npx wrangler d1 create stashly
# Copia el database_id que devuelve el comando en wrangler.jsonc
npm run db:remote
npm run worker:deploy
```

El despliegue queda en `https://stashly.<subdominio>.workers.dev`. Las cuentas y los datos viven en D1, no en el código, así que cada persona ve solo su lista.

## Estructura

```
stashly/
├── client/src/          # SPA: vistas, componentes, stores y demo estática
├── server/              # API: auth, colecciones, productos, scraping y backups
├── public/              # Icono y assets públicos
├── scripts/             # Utilidades de arranque en Windows
└── .github/workflows/   # Despliegue de la demo en GitHub Pages
```

---

Hecho con cariño para guardar con estilo.
