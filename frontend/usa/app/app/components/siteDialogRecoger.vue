<template>
  <div class="summary-wrapper">
    <!-- ================== OVERLAY REDIRECCIÓN ================== -->
    <Transition name="fade">
      <div v-if="isRedirecting" class="redirect-overlay">
        <div class="redirect-content">
          <div class="redirect-spinner">
            <Icon name="mdi:rocket-launch-outline" size="3em" class="rocket-icon" />
            <div class="pulse-ring"></div>
          </div>
          <h2 class="redirect-title">Te estamos llevando a</h2>
          <h3 class="redirect-store">{{ targetSiteName || 'Nueva sede' }}</h3>
          <p class="redirect-subtitle">Transfiriendo tu pedido...</p>
        </div>
      </div>
    </Transition>

    <div class="summary-card">
      <div class="card-header">
        <h5 class="title">Resumen</h5>
      </div>

      <div class="product-list">
        <div
          v-for="product in store.cart"
          :key="product.productogeneral_id || product.signature"
          class="product-item"
        >
          <div class="product-main-row">
            <div class="product-info">
              <span class="qty-badge">( {{ product.pedido_cantidad }} )</span>
              <span class="product-name">
                {{ formatName(product.pedido_nombre_producto) }}
              </span>
            </div>

            <div class="product-price">
              <span v-if="product.modificadorseleccionList.length < 1">
                {{ formatoPesosColombianos(product.pedido_base_price * product.pedido_cantidad) }}
              </span>
              <span v-else>
                {{ formatoPesosColombianos(store.calculateSubtotalProduct(product)) }}
              </span>
            </div>
          </div>

          <div
            v-if="product.lista_productocombo && product.lista_productocombo.length > 0"
            class="combo-list"
          >
            <div
              v-for="comboItem in product.lista_productocombo"
              :key="comboItem.producto_id"
              class="combo-item"
            >
              <span class="combo-qty">
                ( {{ product.pedido_cantidad }} ) <b>{{ parseInt(comboItem.pedido_cantidad) }}</b>
              </span>
              <span class="combo-name">{{ formatName(comboItem.pedido_nombre) }}</span>
            </div>
          </div>

          <div
            v-if="product.modificadorseleccionList && product.modificadorseleccionList.length > 0"
            class="additions-list"
          >
            <div
              v-for="item in product.modificadorseleccionList"
              :key="item.modificadorseleccion_id || item.modificadorseleccion_nombre"
              class="addition-row"
            >
              <div class="addition-name">
                - ( {{ product.pedido_cantidad }} ) <b>{{ item.modificadorseleccion_cantidad }}</b>
                {{ formatName(item.modificadorseleccion_nombre) }}
              </div>
              <div v-if="item.pedido_precio > 0" class="addition-price">
                {{
                  formatoPesosColombianos(
                    item.pedido_precio * item.modificadorseleccion_cantidad * product.pedido_cantidad
                  )
                }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="summary-totals">
        <div class="total-row">
          <span class="label">Subtotal</span>
          <span class="value">{{ formatoPesosColombianos(store.cartSubtotal) }}</span>
        </div>

        <div class="total-row" v-if="store.cartTotalDiscount > 0">
          <span class="label discount">Descuento</span>
          <span class="value discount">- {{ formatoPesosColombianos(store.cartTotalDiscount) }}</span>
        </div>

        <div class="total-row" v-if="siteStore?.location?.site?.site_id != 33">
          <div class="label-wrapper">
            <span class="label" :class="{ strike: deliveryPrice === 0 && !isEditingDelivery }">
              Domicilio
            </span>

            <button
              v-if="isLoggedIn"
              type="button"
              class="edit-btn"
              @click="toggleEditDelivery"
              :disabled="isRedirecting"
            >
              {{ isEditingDelivery ? 'Guardar' : 'Cambiar' }}
            </button>
          </div>

          <div class="value">
            <div v-if="isEditingDelivery">
              <input
                type="number"
                v-model.number="deliveryPrice"
                class="delivery-input"
                :disabled="isRedirecting"
              />
            </div>

            <div v-else>
              <template v-if="deliveryPrice === 0">
                <span class="free-delivery">
                  {{ route.path.includes('reservas') ? 'Ir a la sede' : 'Recoger en local' }}
                </span>
              </template>

              <template v-else>
                {{ formatoPesosColombianos(deliveryPrice) }}
              </template>
            </div>
          </div>
        </div>

        <div class="total-row final-total">
          <span class="label">Total</span>
          <span class="value">
            {{ formatoPesosColombianos(store.cartTotal + (deliveryPrice || 0)) }}
          </span>
        </div>
      </div>

      <div class="actions-container">
        <div
          v-if="siteStore.status?.status === 'closed' && route.path !== '/reservas'"
          class="closed-alert"
        >
          <i class="pi pi-clock"></i> Cerrado, abre a las {{ siteStore.status.next_opening_time }}
        </div>

        <div class="buttons-stack">
          <NuxtLink to="/" v-if="route.path.includes('cart')" class="link-wrapper">
            <button type="button" class="btn btn-text" :disabled="isRedirecting">
              Volver al menú
            </button>
          </NuxtLink>

          <NuxtLink to="/cart" v-else-if="route.path !== '/reservas'" class="link-wrapper">
            <button type="button" class="btn btn-text" :disabled="isRedirecting">
              Volver al carrito
            </button>
          </NuxtLink>

          <!-- ✅ Reservas: ir a pagar -->
          <NuxtLink
            to="/pay"
            v-if="route.path === '/reservas' && siteStore.status?.status !== 'closed'"
            class="link-wrapper"
          >
            <button type="button" class="btn btn-primary" :disabled="isRedirecting">
              Pedir
            </button>
          </NuxtLink>

          <!-- ✅ Carrito: ir a pagar -->
          <NuxtLink
            to="/pay"
            v-else-if="route.path === '/cart' && siteStore.status?.status !== 'closed'"
            class="link-wrapper"
          >
            <button type="button" class="btn btn-primary" :disabled="isRedirecting">
              Finalizar pedido
            </button>
          </NuxtLink>

          <!-- ✅ Pay: generar pedido -->
          <button
            v-else-if="
              route.path === '/pay' &&
              !reportes.loading.visible &&
              siteStore.status?.status !== 'closed' &&
              (isLoggedIn || user.user.payment_method_option?.id != 9)
            "
            type="button"
            class="btn btn-primary"
            :disabled="reportes.loading.visible || isRedirecting"
            @click="orderService.sendOrder()"
          >
            <span v-if="reportes.loading.visible">Procesando...</span>
            <span v-else>{{ isLoggedIn ? 'Generar Pedido / Link' : 'Finalizar pedido' }}</span>
          </button>

          <!-- ✅ Pay: tarjeta -->
          <button
            v-else-if="
              route.path === '/pay' &&
              !reportes.loading.visible &&
              siteStore.status?.status !== 'closed' &&
              !isLoggedIn &&
              user.user.payment_method_option?.id == 9
            "
            type="button"
            class="btn btn-primary"
            :disabled="reportes.loading.visible || isRedirecting"
            @click="pay"
          >
            <span v-if="reportes.loading.visible">Procesando...</span>
            <span v-else>Pagar con tarjeta</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useHead } from '#imports'
import { formatoPesosColombianos } from '~/service/utils/formatoPesos'
import { usecartStore, useSitesStore, useUserStore, useReportesStore } from '#imports'
import { orderService } from '@/service/order/orderService.ts'
import { orderServiceEpayco } from '@/service/order/orderServiceEpayco'
import { URI, SELF_URI } from '@/service/conection'

/* --- Script ePayco (solo si pagan tarjeta) --- */
useHead({
  script: [{ src: 'https://checkout.epayco.co/checkout.js', async: true, defer: true }]
})

/* ================= STORES / ROUTE ================= */
const reportes = useReportesStore()
const route = useRoute()
const store = usecartStore()
const siteStore = useSitesStore()
const user = useUserStore()

/* ================= Helpers ================= */
const ensureNeighborhood = () => {
  if (!siteStore.location) siteStore.location = {}
  if (!siteStore.location.neigborhood) {
    siteStore.location.neigborhood = {
      name: '',
      delivery_price: 0,
      neighborhood_id: null,
      id: null,
      site_id: null
    }
  }
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const isPickupOrder = computed(() => [2, 6].includes(Number(user.user?.order_type?.id)))
const isReserva = computed(() => route.path.includes('reservas'))

/**
 * ✅ deliveryPrice “verdadero” (evita valor viejo):
 * Prioridad:
 *  1) Si es pickup o reservas => 0
 *  2) neigborhood.delivery_price (si ya está seteado)
 *  3) address_details.delivery_cost_cop (google coverage)
 *  4) user.user.site.delivery_cost_cop (dispatcher/google)
 *  5) siteStore.current_delivery (fallback)
 */
const deliveryPrice = computed({
  get: () => {
    if (isReserva.value || isPickupOrder.value) return 0

    const nb = siteStore.location?.neigborhood
    if (nb && nb.delivery_price != null) {
      const v = Number(nb.delivery_price) || 0
      if (v > 0) return v
    }

    const ad = store.address_details || siteStore.location?.address_details
    if (ad && ad.delivery_cost_cop != null) return Number(ad.delivery_cost_cop) || 0

    const uSite = user.user?.site
    if (uSite && uSite.delivery_cost_cop != null) return Number(uSite.delivery_cost_cop) || 0

    if (siteStore.current_delivery != null) return Number(siteStore.current_delivery) || 0

    return 0
  },
  set: (v) => {
    ensureNeighborhood()
    const val = Math.max(0, Number(v) || 0)
    siteStore.location.neigborhood.delivery_price = val
    siteStore.current_delivery = val

    // opcional: si existe address_details, mantenlo consistente para el payload
    if (store.address_details) store.address_details.delivery_cost_cop = val
    if (siteStore.location?.address_details) siteStore.location.address_details.delivery_cost_cop = val
  }
})

/* ================= Login / edición domicilio ================= */
const isEditingDelivery = ref(false)
const order_id = ref('')
const epaycoPublicKey = 'ad3bfbac4531d3b82ece35e36bdf320a'
const isLoggedIn = computed(() => !!user.user?.token && !!user.user?.inserted_by)

const toggleEditDelivery = () => {
  if (isRedirecting.value) return

  // Si estaba editando y va a guardar:
  if (isEditingDelivery.value) {
    const v = deliveryPrice.value
    ensureNeighborhood()
    siteStore.location.neigborhood.delivery_price = v
    siteStore.current_delivery = v
  }
  isEditingDelivery.value = !isEditingDelivery.value
}

/* ================= Nombre producto ================= */
const formatName = (str) => {
  if (!str) return ''
  const lower = str.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * ✅ Sincroniza store con dispatcher/google apenas cambien.
 * (Y NO pisa cuando estás editando manualmente)
 */
watch(
  () => [
    user.user?.order_type?.id,
    store.address_details?.delivery_cost_cop,
    siteStore.location?.address_details?.delivery_cost_cop,
    user.user?.site?.delivery_cost_cop,
    siteStore.current_delivery,
    route.path
  ],
  () => {
    if (isEditingDelivery.value) return
    ensureNeighborhood()
    const v = deliveryPrice.value
    siteStore.location.neigborhood.delivery_price = v
    siteStore.current_delivery = v
  },
  { immediate: true }
)

/* ================= REDIRECT (igual que checkout) ================= */
const isRedirecting = ref(false)
const targetSiteName = ref('')

const safeClone = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj ?? null))
  } catch {
    return obj ?? null
  }
}

const resolveCoverageData = computed(() => {
  // prioridad: address_details (google coverage) -> user.user.site (si es payload tipo coverage)
  return store.address_details || user.user?.site || null
})

const resolveNearestSite = (data) => {
  if (!data) return null
  return data?.nearest?.site || data?.site_location || data?.site || (data?.site_id ? data : null)
}

const getBaseDomain = () => {
  const host = window.location.hostname
  if (host.includes('localhost')) return null
  const parts = host.split('.')
  if (parts.length <= 2) return host
  // quita el subdominio actual y deja el dominio base (incluye "usa." si aplica en tu infra)
  return parts.slice(1).join('.')
}

const buildTargetUrl = (subdomain, hash) => {
  const protocol = window.location.protocol
  const isDev = window.location.hostname.includes('localhost')

  // Mantén el paso donde está el usuario
  const path = route.path === '/pay' ? '/pay' : route.path === '/cart' ? '/cart' : route.path

  if (isDev) return `${protocol}//${subdomain}.localhost:3000${path}?hash=${hash}`

  const base = getBaseDomain()
  if (!base) return null
  return `${protocol}//${subdomain}.${base}${path}?hash=${hash}`
}

const shouldRedirectBySiteMismatch = computed(() => {
  if (typeof window === 'undefined') return false
  if (isRedirecting.value) return false
  if (isPickupOrder.value || isReserva.value) return false

  const data = resolveCoverageData.value
  const nearest = resolveNearestSite(data)
  const current = siteStore.location?.site

  if (!nearest?.site_id || !current?.site_id) return false
  return String(nearest.site_id) !== String(current.site_id)
})

const handleSiteChange = async (data) => {
  const nearestSite = resolveNearestSite(data)
  if (!nearestSite?.subdomain) return

  isRedirecting.value = true
  targetSiteName.value = nearestSite.site_name || 'Nueva sede'

  try {
    const hash = generateUUID()

    const payload = {
      user: {
        ...safeClone(user.user),
        // ✅ importante: manda lo que esté seleccionado (tipo orden, método, placa, etc)
        order_type: safeClone(user.user?.order_type),
        payment_method_option: safeClone(user.user?.payment_method_option),
        // ✅ manda la data de cobertura si existe
        site: safeClone(data),
        address: data?.formatted_address || safeClone(user.user?.address) || null,
        lat: data?.lat ?? safeClone(user.user?.lat) ?? null,
        lng: data?.lng ?? safeClone(user.user?.lng) ?? null,
        place_id: data?.place_id ?? safeClone(user.user?.place_id) ?? null
      },
      cart: safeClone(store.cart),
      site_location: safeClone(nearestSite),
      discount: safeClone(store.applied_coupon || null),
      coupon_ui: safeClone(store.coupon_ui || null),
      coupon_code: store.applied_coupon?.code || store.coupon_ui?.draft_code || null,
      order_notes: safeClone(store.order_notes || null),
      address_details: safeClone(store.address_details || null),
      current_delivery: Number(siteStore.current_delivery) || 0
    }

    await fetch(`${URI}/data/${hash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const url = buildTargetUrl(nearestSite.subdomain, hash)
    if (!url) {
      alert('Lo sentimos, no pudimos construir la URL de esta sede.')
      isRedirecting.value = false
      return
    }

    window.location.href = url
  } catch (e) {
    console.error('Error switching site:', e)
    alert('Ocurrió un error al cambiar de sede. Intenta nuevamente.')
    isRedirecting.value = false
  }
}

// ✅ si llega coverage/dispatcher apuntando a otra sede, redirecciona con overlay + payload
watch(
  () => [
    shouldRedirectBySiteMismatch.value,
    store.address_details?.nearest?.site?.site_id,
    user.user?.site?.nearest?.site?.site_id,
    siteStore.location?.site?.site_id
  ],
  async () => {
    if (!shouldRedirectBySiteMismatch.value) return
    const data = resolveCoverageData.value
    if (!data) return
    await handleSiteChange(data)
  },
  { immediate: true }
)

/* ================= ePayco ================= */
const pay = async () => {
  if (typeof window !== 'undefined' && !window.ePayco) {
    console.warn('El SDK de ePayco aun no ha cargado.')
    alert('Cargando pasarela de pagos, intenta de nuevo en un momento...')
    return
  }

  order_id.value = await orderServiceEpayco.sendOrder()
  if (!order_id.value) return
  payWithEpayco(order_id.value)
}

const payWithEpayco = (id) => {
  if (typeof window === 'undefined' || !window.ePayco) {
    console.error('ePayco SDK no cargado')
    return
  }

  const handler = window.ePayco.checkout.configure({
    key: epaycoPublicKey,
    test: false,
    response_type: 'redirect',
    onClosed: () => console.log('Modal cerrado')
  })

  const totalAPagar = store.cartTotal + (deliveryPrice.value || 0)

  handler.open({
    name: id,
    description: `Pedido ${id}`,
    amount: totalAPagar,
    currency: siteStore?.location?.site?.time_zone === 'America/New_York' ? 'usd' : 'cop',
    invoice: id,
    country: 'co',
    lang: 'es',
    external: 'false',
    confirmation: `${URI}/confirmacion-epayco`,
    response: `${SELF_URI}/gracias-epayco`,
    name_billing: user.user.name || '',
    address_billing: user.user.address || '',
    type_doc_billing: 'cc',
    mobilephone_billing: user.user.phone_number || '',
    email_billing: user.user.email || '',
    methodsDisable: ['SP', 'CASH']
  })
}

/* ================= Mount ================= */
onMounted(() => {
  ensureNeighborhood()
})
</script>

<style scoped>
/* =========================================
   OVERLAY REDIRECCIÓN (igual que checkout)
   ========================================= */
.redirect-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.redirect-content {
  text-align: center;
  animation: popIn 0.5s ease-out;
}
.redirect-spinner {
  position: relative;
  display: inline-flex;
  margin-bottom: 2rem;
  color: #ff6600;
}
.rocket-icon {
  z-index: 2;
  animation: rocketFloat 1.5s ease-in-out infinite alternate;
  color: #ff6600;
}
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #ff6600;
  opacity: 0;
  animation: pulse 2s infinite;
}
.redirect-title {
  font-size: 1.2rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.redirect-store {
  font-size: 2rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0.5rem 0;
  line-height: 1.1;
  max-width: 90vw;
}
.redirect-subtitle {
  font-size: 1rem;
  color: #94a3b8;
  margin-top: 1rem;
}

@keyframes popIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes rocketFloat {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-10px);
  }
}
@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- Card --- */
.summary-card {
  background-color: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  position: sticky;
  top: 6rem;
  transition: all 0.3s ease;
}

.title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 1rem;
}

/* --- Lista de Productos --- */
.product-list {
  display: flex;
  flex-direction: column;
  padding-right: 0.5rem;
}

.product-list::-webkit-scrollbar {
  width: 4px;
}
.product-list::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 4px;
}

.product-item {
  border-bottom: 3px dashed var(--border-color);
  padding: 0.5rem 0;
}
.product-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.product-main-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 0.95rem;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.product-info {
  display: flex;
  gap: 0.5rem;
}

.qty-badge {
  font-weight: 600;
  min-width: 24px;
  color: var(--primary);
  min-width: max-content;
}

.product-name {
  font-weight: 500;
  line-height: 1.4;
}

.product-price {
  font-weight: 600;
  white-space: nowrap;
  margin-left: 0.5rem;
}

/* --- Combos y Adiciones --- */
.combo-list,
.additions-list {
  margin-left: 1.8rem;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.combo-item,
.addition-row {
  display: flex;
  justify-content: start;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.combo-qty {
  font-weight: 600;
  margin-right: 0.5rem;
}
.addition-price {
  font-weight: 500;
  white-space: nowrap;
  margin-left: 0.5rem;
}

/* --- Totales --- */
.divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 1.5rem 0;
}

.summary-totals {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: var(--text-main);
}

.label {
  color: var(--text-secondary);
}
.value {
  font-weight: 600;
}

.discount {
  color: var(--success-text);
}
.strike {
  text-decoration: line-through;
  opacity: 0.6;
}
.free-delivery {
  color: var(--success-text);
  font-weight: 700;
  font-size: 0.8rem;
}

.final-total {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 2px solid var(--border-color);
  font-size: 1.25rem;
}
.final-total .label {
  color: var(--text-main);
  font-weight: 700;
}
.final-total .value {
  font-weight: 800;
}

/* --- ESTILOS EDICIÓN DOMICILIO --- */
.label-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-btn {
  background: none;
  border: 1px solid var(--primary);
  color: var(--primary);
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.edit-btn:hover {
  background-color: var(--primary);
  color: white;
}

.delivery-input {
  width: 100px;
  padding: 0.2rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: right;
  font-weight: 600;
  outline: none;
}

.delivery-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

.delivery-input::-webkit-outer-spin-button,
.delivery-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.delivery-input[type='number'] {
  -moz-appearance: textfield;
}

/* --- Botones --- */
.actions-container {
  margin-top: 2rem;
}

.closed-alert {
  background-color: var(--danger-bg);
  color: var(--danger-text);
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;
  border: 1px solid #fecaca;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.buttons-stack {
  display: flex;
  flex-direction: column-reverse;
  gap: 0.75rem;
}

.btn {
  width: 100%;
  padding: 0.875rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.btn-primary {
  background-color: var(--primary);
  color: white;
  border: 1px solid var(--primary);
}
.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-text {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
}
.btn-text:hover {
  color: var(--text-main);
  text-decoration: underline;
  background-color: #f9fafb;
}

.link-wrapper {
  text-decoration: none;
  display: block;
  width: 100%;
}

@media (max-width: 768px) {
  .summary-card {
    position: relative;
    top: 0;
    border: none;
    box-shadow: var(--shadow);
    padding: 1rem;
  }
  .summary-wrapper {
    padding: 0;
    margin-top: 2rem;
  }
  .final-total {
    font-size: 1.1rem;
  }
}
</style>
