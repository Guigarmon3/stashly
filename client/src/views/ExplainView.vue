<template>
  <div class="page-shell" style="max-width: 980px">
    <PageHeader
      index="05"
      label="Guía"
      title="Explicaciones"
      accent="claras"
      subtitle="Todo lo que necesitas saber para sacar partido a Stashly, sin letra pequeña."
    />

    <div class="border-t border-[var(--line)]">
      <AccordionItem title="¿Cómo añadir un producto por URL?" icon="Link">
        <ol class="space-y-2">
          <li>1. Pulsa <strong>Añadir producto</strong> en la barra lateral.</li>
          <li>2. Pega la URL del producto que quieras guardar.</li>
          <li>3. Pulsa <strong>Analizar</strong>: Stashly extrae imagen, título, precio y tienda.</li>
          <li>4. Revisa y edita la información, asigna carpeta, añade notas o precio objetivo.</li>
          <li>5. Pulsa <strong>Guardar</strong>.</li>
        </ol>
        <p class="mt-3 text-sm text-[var(--muted)]">
          Funciona con Amazon, PcComponentes y la gran mayoría de tiendas online.
          La extracción se hace en el servidor para evitar problemas de CORS.
        </p>
      </AccordionItem>

      <AccordionItem title="Organizar por carpetas" icon="Folder">
        <ul class="space-y-2">
          <li><strong>Crear:</strong> pulsa el + junto a Carpetas en la barra lateral.</li>
          <li><strong>Mover:</strong> usa la selección múltiple o el detalle del producto.</li>
          <li><strong>Colapsar / expandir:</strong> pulsa la flecha junto a cada carpeta.</li>
          <li><strong>Ver carpeta:</strong> pulsa el nombre de la carpeta para filtrar.</li>
        </ul>
      </AccordionItem>

      <AccordionItem title="Marcar comprado, favorito, notas y precio objetivo" icon="Heart">
        <ul class="space-y-2">
          <li><strong>Favorito:</strong> pulsa el corazón en la tarjeta o en el detalle.</li>
          <li><strong>Comprado:</strong> pulsa el check para marcarlo. Aparecerá con un sello visual.</li>
          <li><strong>Notas:</strong> abre el detalle del producto para añadir notas personales.</li>
          <li><strong>Precio objetivo:</strong> en el detalle puedes fijarlo y verás un indicador al alcanzarlo.</li>
        </ul>
      </AccordionItem>

      <AccordionItem title="Filtros, vista y ordenación" icon="Filter">
        <ul class="space-y-2">
          <li><strong>Vista:</strong> alterna entre cuadrícula y lista con el icono superior.</li>
          <li><strong>Ordenar:</strong> por fecha, alfabéticamente o por precio.</li>
          <li><strong>Buscar:</strong> por título, tienda o notas.</li>
          <li><strong>Filtros rápidos:</strong> favoritos desde la barra de herramientas o la barra lateral.</li>
        </ul>
      </AccordionItem>

      <AccordionItem title="Selección múltiple y acciones masivas" icon="CheckSquare">
        <ol class="space-y-2">
          <li>1. Pulsa <strong>Seleccionar</strong> en la cabecera.</li>
          <li>2. Marca los productos que quieras.</li>
          <li>3. Usa las acciones: mover a carpeta, marcar comprado o eliminar.</li>
        </ol>
      </AccordionItem>

      <AccordionItem title="Exportar / Importar (backup)" icon="Download">
        <p class="mb-3">
          Puedes hacer una copia completa de toda tu colección.
        </p>
        <ul class="space-y-2">
          <li>
            <strong>Exportar:</strong> usa la API <code>/api/sync/export</code>. El backup
            incluye carpetas, productos e historial de precios en JSON.
          </li>
          <li>
            <strong>Importar:</strong> restaura desde un backup JSON. Se fusiona con tu
            colección actual sin borrar lo existente.
          </li>
        </ul>
      </AccordionItem>

      <AccordionItem title="Papelera" icon="Trash2">
        <ul class="space-y-2">
          <li>Al eliminar un producto, va a la <strong>Papelera</strong> (borrado suave).</li>
          <li>Puedes restaurarlo desde la Papelera.</li>
          <li>O eliminarlo definitivamente: una acción irreversible.</li>
        </ul>
      </AccordionItem>

      <AccordionItem title="Historial de precios" icon="TrendingDown">
        <p>
          Stashly guarda automáticamente el precio cada vez que detecta un cambio al
          actualizar el producto. En el detalle puedes ver el historial completo con
          mínimo y máximo.
        </p>
      </AccordionItem>

      <AccordionItem title="Sincronización y login" icon="Cloud">
        <div class="space-y-3">
          <p><strong>Fullstack autocontenido con autenticación y sincronización.</strong></p>
          <ul class="space-y-2">
            <li><strong>Autenticación propia:</strong> registro y login con email y contraseña, sesiones httpOnly.</li>
            <li><strong>Base de datos:</strong> SQLite local en <code>./data/stashly.db</code>.</li>
            <li><strong>Sincronización:</strong> todos los datos se guardan en el servidor. Al iniciar sesión accedes a tu colección.</li>
            <li><strong>Scraping server-side:</strong> el análisis de URLs se hace en el backend con Cheerio, sin APIs externas.</li>
            <li><strong>Sin dependencias de terceros:</strong> no se usa ningún servicio externo para auth, scraping o almacenamiento.</li>
          </ul>
          <p class="text-sm text-[var(--muted)]">
            Todo corre desde un solo proceso: <code>npm start</code> sirve frontend y backend.
          </p>
        </div>
      </AccordionItem>

      <AccordionItem title="Trucos y atajos" icon="Zap">
        <ul class="space-y-2">
          <li><strong>Click rápido:</strong> abre el detalle; al pasar el ratón aparecen las acciones.</li>
          <li><strong>Enter:</strong> en el modal de añadir URL analiza automáticamente.</li>
          <li><strong>Duplicados:</strong> Stashly te avisa si la URL ya está guardada.</li>
          <li><strong>Animaciones:</strong> transiciones suaves en toda la app, respetando reduced motion.</li>
        </ul>
      </AccordionItem>

      <AccordionItem title="Preguntas frecuentes" icon="HelpCircle">
        <div class="space-y-4">
          <div>
            <p class="mb-1 font-medium text-[var(--ink)]">¿Funciona sin internet?</p>
            <p>
              Para ver y gestionar productos guardados, sí. Para añadir nuevos productos
              por URL necesitas conexión para el scraping en el servidor.
            </p>
          </div>
          <div>
            <p class="mb-1 font-medium text-[var(--ink)]">¿Dónde se guardan los datos?</p>
            <p>En SQLite local, en <code>./data/stashly.db</code>. Todo autocontenido en tu equipo.</p>
          </div>
          <div>
            <p class="mb-1 font-medium text-[var(--ink)]">¿Puedo usarlo en varios dispositivos?</p>
            <p>
              Sí. Si despliegas el servidor en tu red local y entras con la misma cuenta,
              los datos se sincronizan a través del servidor SQLite.
            </p>
          </div>
          <div>
            <p class="mb-1 font-medium text-[var(--ink)]">¿Es seguro?</p>
            <p>
              Contraseñas hasheadas con bcrypt, sesiones httpOnly y sin dependencias
              externas. Úsalo en un entorno confiable o configura HTTPS en producción.
            </p>
          </div>
        </div>
      </AccordionItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
import AccordionItem from '@/components/AccordionItem.vue'
</script>
