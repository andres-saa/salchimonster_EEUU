<!-- pages/gracias-stripe.vue -->
<template>
  <ClientOnly>
    <div class="page">
      <!-- ===== MAIN CARD ===== -->
      <div class="card" v-if="!isLoading && (order?.order_id || hasStripeInfo)">
        <header class="header">
          <h1 class="title">Estado del pago</h1>

          <div class="status-badge" :class="statusClass">
            {{ statusLabel }}
          </div>

          <p class="subtitle" v-if="statusHint">
            {{ statusHint }}
          </p>

          <div class="order-id" v-if="order?.order_id">
            <span>ORDEN</span>
            <b>{{ order.order_id }}</b>
          </div>

          <p class="meta" v-if="order?.latest_status_timestamp">
            <b>Fecha:</b> {{ (order.latest_status_timestamp || '').split('T')[0] || '-' }}
            <span class="dot">•</span>
            <b>Hora:</b>
            {{ (order.latest_status_timestamp || '').split('T')[1]?.split(':')?.slice(0,2)?.join(':') || '-' }}
          </p>
        </header>

        <!-- ===== PRODUCTS ===== -->
        <section class="section" v-if="order?.order_id">
          <h2 class="section-title">Productos</h2>

          <div class="products">
            <div
              class="product"
              v-for="(p, idx) in (order.pe_json?.listaPedidos || [])"
              :key="p.signature || p.pedido_productoid || idx"
            >
              <div class="row">
                <div class="left">
                  <div class="name">
                    <b>({{ p.pedido_cantidad }})</b> {{ p.pedido_nombre_producto }}
                  </div>

                  <div class="sub" v-if="p.lista_productocombo?.length">
                    <div class="sub-title">Combo incluye:</div>
                    <div class="sub-item" v-for="(c, k) in p.lista_productocombo" :key="k">
                      — <b>{{ c.pedido_cantidad }}</b> {{ c.pedido_nombre }}
                    </div>
                  </div>

                  <div class="sub" v-if="p.modificadorseleccionList?.length">
                    <div class="sub-title">Adicionales:</div>
                    <div
                      class="sub-item sub-item--between"
                      v-for="(m, k) in p.modificadorseleccionList"
                      :key="m.modificadorseleccion_id || m.modificadorseleccion_nombre || k"
                    >
                      <span>
                        — <b>{{ m.modificadorseleccion_cantidad }}</b> {{ m.modificadorseleccion_nombre }}
                      </span>
                      <span v-if="Number(m.pedido_precio) > 0" class="sub-price">
                        + {{ pesos(m.pedido_precio * m.modificadorseleccion_cantidad * p.pedido_cantidad) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="right">
                  <div class="price">
                    {{ pesos((p.pedido_base_price || p.pedido_precio || 0) * (p.pedido_cantidad || 0)) }}
                  </div>
                </div>
              </div>

              <div class="divider"></div>
            </div>
          </div>
        </section>

        <!-- ===== TOTALS ===== -->
        <section class="section" v-if="order?.order_id">
          <h2 class="section-title">Totales</h2>

          <div class="totals">
            <div class="tot-row">
              <span>Subtotal</span>
              <b>{{ pesos(calcSubtotal()) }}</b>
            </div>

            <div class="tot-row" v-if="Number(order.pe_json?.delivery?.total_descuento || 0) > 0">
              <span>Descuento</span>
              <b class="red">- {{ pesos(order.pe_json.delivery.total_descuento) }}</b>
            </div>

            <div class="tot-row">
              <span>Domicilio</span>
              <b>{{ pesos(order.pe_json?.delivery?.delivery_costoenvio || 0) }}</b>
            </div>

            <div class="tot-row tot-row--final">
              <span>Total a pagar</span>
              <b>{{ pesos(order.pe_json?.delivery?.delivery_pagocon || 0) }}</b>
            </div>
          </div>
        </section>

        <!-- ===== STRIPE INFO ===== -->
        <section class="section" v-if="hasStripeInfo">
          <h2 class="section-title">Información de pago (Stripe)</h2>

          <div class="pay-box">
            <div class="pay-row" v-if="orderId">
              <span class="label">Order ID</span>
              <span class="val">{{ orderId }}</span>
            </div>

            <div class="pay-row" v-if="paymentIntent">
              <span class="label">PaymentIntent</span>
              <span class="val">{{ paymentIntent }}</span>
            </div>

            <div class="pay-row" v-if="redirectStatus">
              <span class="label">Estado</span>
              <span class="val" :class="statusTextClass">{{ redirectStatus }}</span>
            </div>

            <div class="pay-row" v-if="order?.payment_method">
              <span class="label">Método</span>
              <span class="val">{{ String(order.payment_method).toLowerCase() }}</span>
            </div>
          </div>
        </section>

        <!-- ===== ACTIONS ===== -->
        <footer class="actions">
          <a class="btn btn-whatsapp" :href="whatsappUrl" target="_blank" rel="noreferrer">
            Escribir por WhatsApp
          </a>

          <NuxtLink class="btn btn-black" to="/">
            Volver al menú
          </NuxtLink>
        </footer>
      </div>

      <!-- ===== LOADING / ERROR ===== -->
      <div class="state" v-else>
        <div v-if="isLoading" class="spinner"></div>
        <h2 v-if="isLoading">Cargando…</h2>

        <div v-else class="error">
          <h2>No se pudo cargar la información</h2>
          <p>Si necesitas ayuda, escríbenos por WhatsApp.</p>

          <a class="btn btn-whatsapp" :href="whatsappUrl" target="_blank" rel="noreferrer">
            Escribir por WhatsApp
          </a>

          <NuxtLink class="btn btn-black" to="/">Volver al menú</NuxtLink>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#imports'

const URI = 'https://backend.salchimonster.com'
const route = useRoute()

const isLoading = ref(true)
const order = ref(null)

// ===== Query params Stripe =====
// Stripe suele agregar: payment_intent, payment_intent_client_secret, redirect_status
const orderId = computed(() => String(route.query?.order_id || route.params?.order_id || '').trim())
const paymentIntent = computed(() => String(route.query?.payment_intent || '').trim())
const redirectStatus = computed(() => String(route.query?.redirect_status || '').trim())

const hasStripeInfo = computed(() => !!orderId.value || !!paymentIntent.value || !!redirectStatus.value)

// ===== Utils =====
const pesos = (v) => {
  const n = Number(v || 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n)
}

const calcSubtotal = () => {
  const d = order.value?.pe_json?.delivery || {}
  const pagocon = Number(d.delivery_pagocon || 0)
  const envio = Number(d.delivery_costoenvio || 0)
  const desc = Number(d.total_descuento || 0)
  return pagocon + desc - envio
}

// ===== Estado Stripe (solo con redirect_status) =====
const stripeKind = computed(() => {
  const s = String(redirectStatus.value || '').toLowerCase()
  if (!s) return order.value?.order_id ? 'ok_unknown' : 'none'

  if (s === 'succeeded') return 'ok'
  if (s === 'failed') return 'failed'
  if (s === 'canceled') return 'canceled'
  if (s === 'processing') return 'processing'
  return 'unknown'
})

const statusLabel = computed(() => {
  switch (stripeKind.value) {
    case 'ok': return 'Pago aprobado ✅'
    case 'failed': return 'Pago fallido ❌'
    case 'canceled': return 'Pago cancelado ⚠️'
    case 'processing': return 'Pago en proceso ⏳'
    case 'ok_unknown': return 'Pago recibido ✅'
    case 'unknown': return 'Pago en revisión'
    default: return 'Sin información'
  }
})

const statusHint = computed(() => {
  switch (stripeKind.value) {
    case 'ok': return 'Tu pago fue confirmado correctamente.'
    case 'failed': return 'El pago no pudo completarse. Puedes intentarlo de nuevo.'
    case 'canceled': return 'El pago fue cancelado.'
    case 'processing': return 'El pago está siendo procesado. Si no cambia, contáctanos.'
    case 'ok_unknown': return 'Gracias. Si ves algún problema, escríbenos.'
    default: return ''
  }
})

const statusClass = computed(() => {
  switch (stripeKind.value) {
    case 'ok':
    case 'ok_unknown':
      return 'ok'
    case 'processing':
      return 'warn'
    case 'canceled':
      return 'warn'
    case 'failed':
      return 'bad'
    case 'unknown':
      return 'neutral'
    default:
      return 'neutral'
  }
})

const statusTextClass = computed(() => {
  switch (stripeKind.value) {
    case 'ok':
    case 'ok_unknown':
      return 'green'
    case 'processing':
      return 'orange'
    case 'canceled':
      return 'orange'
    case 'failed':
      return 'red'
    default:
      return ''
  }
})

// ===== WhatsApp =====
const whatsappUrl = computed(() => {
  const baseUrl = 'https://api.whatsapp.com/send'
  const phone = '573053447255'

  const ord = order.value?.order_id || orderId.value || ''
  const pi = paymentIntent.value || ''
  const st = redirectStatus.value || ''

  const msg = ord
    ? `Hola, necesito ayuda con el pago de mi orden #${ord}. Stripe: ${pi ? `PI ${pi}. ` : ''}${st ? `Estado: ${st}.` : ''}`
    : `Hola, necesito ayuda con un pago en Stripe. ${pi ? `PI ${pi}. ` : ''}${st ? `Estado: ${st}.` : ''}`

  const params = new URLSearchParams({ phone, text: msg })
  return `${baseUrl}?${params.toString()}`
})

// ===== Load order =====
onMounted(async () => {
  isLoading.value = true
  try {
    if (!orderId.value) {
      // igual mostramos info stripe si llegó algo, pero sin order_id no podemos traer orden
      isLoading.value = false
      return
    }

    // Intento 1: /order-by-id/:id
    try {
      const data = await $fetch(`${URI}/order-by-id/${encodeURIComponent(orderId.value)}`)
      if (data?.order_id) {
        order.value = data
        return
      }
    } catch {}

    // Fallback: /order/:id
    try {
      const data2 = await $fetch(`${URI}/order/${encodeURIComponent(orderId.value)}`)
      if (data2?.order_id) {
        order.value = data2
        return
      }
    } catch {}

    order.value = null
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
* { box-sizing: border-box; }

.page{
  min-height:100vh;
  padding:24px 12px;
  background:#f3f4f6;
  display:flex;
  justify-content:center;
  align-items:flex-start;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}

.card{
  width:100%;
  max-width:520px;
  background:#fff;
  border-radius:16px;
  box-shadow:0 10px 30px rgba(0,0,0,.08);
  border:1px solid #e5e7eb;
  overflow:hidden;
}

.header{
  padding:18px 16px 12px;
  text-align:center;
  border-bottom:1px dashed #e5e7eb;
}

.title{
  margin:0;
  font-size:18px;
  font-weight:900;
  color:#111827;
}

.subtitle{
  margin:10px 0 0;
  font-size:13px;
  color:#374151;
  font-weight:800;
}

.status-badge{
  margin:12px auto 0;
  width:max-content;
  padding:8px 12px;
  border-radius:999px;
  font-weight:900;
  font-size:12px;
  letter-spacing:.4px;
  text-transform:uppercase;
  border:1px solid transparent;
}
.status-badge.ok{ background:#dcfce7; color:#166534; border-color:#86efac; }
.status-badge.warn{ background:#ffedd5; color:#9a3412; border-color:#fdba74; }
.status-badge.bad{ background:#fee2e2; color:#991b1b; border-color:#fca5a5; }
.status-badge.neutral{ background:#e5e7eb; color:#111827; border-color:#d1d5db; }

.order-id{
  margin:12px auto 0;
  display:inline-flex;
  gap:8px;
  align-items:center;
  padding:8px 12px;
  border-radius:999px;
  background:#111827;
  color:#fff;
  font-size:12px;
  font-weight:900;
  letter-spacing:.5px;
}

.meta{
  margin:10px 0 0;
  font-size:12px;
  color:#374151;
  font-weight:600;
}
.dot{ margin:0 6px; color:#9ca3af; }

.section{ padding:14px 16px; }
.section-title{
  margin:0 0 10px;
  font-size:13px;
  font-weight:900;
  color:#111827;
  text-transform:uppercase;
  letter-spacing:.5px;
}

/* Products */
.products{ display:flex; flex-direction:column; gap:10px; }
.product .row{ display:flex; gap:12px; justify-content:space-between; align-items:flex-start; }
.left{ flex:1; min-width:0; }
.name{ font-size:14px; font-weight:800; color:#111827; line-height:1.25; }
.right{ flex-shrink:0; }
.price{ font-size:14px; font-weight:900; color:#111827; white-space:nowrap; }

.sub{ margin-top:6px; padding-left:12px; border-left:2px solid #e5e7eb; }
.sub-title{ font-size:11px; font-weight:900; color:#6b7280; text-transform:uppercase; margin-bottom:4px; }
.sub-item{ font-size:12px; color:#374151; font-weight:700; line-height:1.35; }
.sub-item--between{ display:flex; justify-content:space-between; gap:10px; }
.sub-price{ white-space:nowrap; font-weight:900; color:#111827; }
.divider{ height:1px; background:#f1f5f9; margin-top:10px; }

/* Totals */
.totals{ display:flex; flex-direction:column; gap:8px; }
.tot-row{ display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#111827; }
.tot-row span{ color:#6b7280; font-weight:900; }
.tot-row b{ font-weight:900; }
.tot-row--final{
  margin-top:6px;
  padding-top:10px;
  border-top:2px solid #111827;
  font-size:16px;
}
.red{ color:#dc2626; }

/* Pay box */
.pay-box{
  border:1px solid #e5e7eb;
  background:#f9fafb;
  border-radius:12px;
  padding:12px;
  display:flex;
  flex-direction:column;
  gap:8px;
}
.pay-row{
  display:grid;
  grid-template-columns:120px 1fr;
  gap:10px;
  align-items:baseline;
  font-size:13px;
}
.label{ color:#6b7280; font-weight:900; text-transform:uppercase; font-size:11px; letter-spacing:.4px; }
.val{ color:#111827; font-weight:800; word-break:break-word; }
.green{ color:#16a34a; font-weight:900; }
.orange{ color:#c2410c; font-weight:900; }
.red{ color:#dc2626; font-weight:900; }

/* Actions */
.actions{
  display:flex;
  gap:10px;
  padding:14px 16px 16px;
  border-top:1px solid #e5e7eb;
  background:#fff;
}
.btn{
  display:inline-flex;
  justify-content:center;
  align-items:center;
  gap:8px;
  width:100%;
  padding:12px 14px;
  border-radius:12px;
  font-weight:900;
  text-decoration:none;
  cursor:pointer;
  border:1px solid transparent;
  transition:transform .08s ease;
  text-transform:uppercase;
  font-size:12px;
  letter-spacing:.4px;
}
.btn:active{ transform:scale(.98); }
.btn-whatsapp{ background:#00b66c; color:#fff; }
.btn-black{ background:#111827; color:#fff; }

/* States */
.state{ width:100%; max-width:520px; text-align:center; padding:32px 16px; }
.error{
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:16px;
  padding:18px;
  box-shadow:0 10px 30px rgba(0,0,0,.06);
}
.error h2{ margin:0 0 6px; font-size:18px; font-weight:900; color:#111827; }
.error p{ margin:0 0 14px; color:#6b7280; font-weight:800; font-size:13px; }

/* Spinner */
.spinner{
  width:44px;
  height:44px;
  border:4px solid #e5e7eb;
  border-top-color:#111827;
  border-radius:50%;
  animation:spin 1s linear infinite;
  margin:0 auto 12px;
}
@keyframes spin{ to{ transform:rotate(360deg); } }

@media (max-width:420px){
  .actions{ flex-direction:column; }
  .pay-row{ grid-template-columns:1fr; }
}
</style>
