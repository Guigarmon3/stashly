<template>
  <div class="auth-shell">
    <section class="auth-intro">
      <div class="auth-brand">
        <span class="brand-mark">S</span>
        <span>
          <span class="brand-word block">Stashly</span>
          <span class="brand-sub block">Wishlist editorial</span>
        </span>
      </div>

      <div class="relative z-10">
        <p class="mono muted mb-5">[ 01 ] Guarda para comprar</p>
        <h1 class="auth-title">Lo que <em>deseas</em>, en orden.</h1>
        <p class="auth-lead">
          Una colección privada para guardar productos, comparar precios y decidir
          con calma. Sin ruido, sin distracciones: solo lo que de verdad quieres.
        </p>
      </div>

      <div class="relative z-10 space-y-5">
        <div class="auth-meta mono">
          <span>01 — Guarda</span>
          <span>02 — Organiza</span>
          <span>03 — Compra</span>
        </div>

        <div class="marquee" aria-hidden="true">
          <div class="marquee-track">
            <span v-for="n in 2" :key="n" class="contents">
              <span class="marquee-item">Wishlist <em>privada</em></span>
              <span class="marquee-item">Precios bajo control</span>
              <span class="marquee-item">Carpetas <em>a tu manera</em></span>
              <span class="marquee-item">Sin APIs externas</span>
              <span class="marquee-item">Datos en tu equipo</span>
            </span>
          </div>
        </div>

        <p class="mono muted">Privado por defecto · Hecho para tu red local</p>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <RouterView />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>
