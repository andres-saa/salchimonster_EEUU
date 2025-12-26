<template>
  <div class="summary-wrapper">
    <div class="summary-card">
      <div class="card-header">
        <h5 class="title">{{ t('summary') }}</h5>
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
                {{ formatName(productDisplayName(product)) }}
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
              <span class="combo-name">
                {{ formatName(comboDisplayName(comboItem)) }}
              </span>
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
                {{ formatName(additionDisplayName(item)) }}
              </div>
              <div v-if="item.pedido_precio > 0" class="addition-price">
                {{ formatoPesosColombianos(item.pedido_precio * item.modificadorseleccion_cantidad * product.pedido_cantidad) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="summary-totals">
        <div class="total-row">
          <span class="label">{{ t('subtotal') }}</span>
          <span class="value">{{ formatoPesosColombianos(store.cartSubtotal) }}</span>
        </div>

        <div class="total-row" v-if="store.cartTotalDiscount > 0">
          <span class="label discount">{{ t('discount') }}</span>
          <span class="value discount">- {{ formatoPesosColombianos(store.cartTotalDiscount) }}</span>
        </div>

        <div class="total-row" v-if="siteStore?.location?.site?.site_id != 33">
          <div class="label-wrapper">
            <span class="label" :class="{ 'strike': deliveryPrice === 0 && !isEditingDelivery }">
              {{ t('delivery') }}
            </span>

            <button
              v-if="isLoggedIn"
              type="button"
              class="edit-btn"
              @click="toggleEditDelivery"
            >
              {{ isEditingDelivery ? t('save') : t('change') }}
            </button>
          </div>

          <div class="value">
            <div v-if="isEditingDelivery">
              <input type="number" v-model.number="deliveryPrice" />
            </div>

            <div v-else>
              <template v-if="siteStore.location.neigborhood.delivery_price === 0">
                <span class="free-delivery">
                  {{ route.path.includes('reservas') ? t('go_to_store') : t('pickup_in_store') }}
                </span>
              </template>

              <template v-else-if="siteStore.location.neigborhood.delivery_price > 0">
                {{ formatoPesosColombianos(siteStore.location.neigborhood.delivery_price) }}
              </template>
            </div>
          </div>
        </div>

        <div class="total-row final-total">
          <span class="label">{{ t('total') }}</span>
          <span class="value">
            {{ formatoPesosColombianos(store.cartTotal + (deliveryPrice || 0)) }}
          </span>
        </div>
      </div>

      <div class="actions-container">
        <div
          v-if="siteStore.status?.status == 'closed' && route.path != '/reservas'"
          class="closed-alert"
        >
          <i class="pi pi-clock"></i>
          {{ t('closed_opens_at') }} {{ siteStore.status.next_opening_time }}
        </div>

        <div class="buttons-stack">
          <NuxtLink to="/" v-if="route.path.includes('cart')" class="link-wrapper">
            <button type="button" class="btn btn-text">
              {{ t('back_to_menu') }}
            </button>
          </NuxtLink>

          <NuxtLink to="/cart" v-else-if="route.path != '/reservas'" class="link-wrapper">
            <button type="button" class="btn btn-text">
              {{ t('back_to_cart') }}
            </button>
          </NuxtLink>

          <NuxtLink
            to="/pay"
            v-if="route.path.includes('cart') && (siteStore.status?.status !== 'closed' && route.path == '/reservas')"
            class="link-wrapper"
          >
            <button type="button" class="btn btn-primary">
              {{ t('order') }}
            </button>
          </NuxtLink>

          <NuxtLink to="/pay" v-else-if="route.path == '/cart'" class="link-wrapper">
            <button type="button" class="btn btn-primary">
              {{ t('checkout') }}
            </button>
          </NuxtLink>

          <button
            v-else-if="route.path == '/pay' && !reportes.loading.visible && siteStore.status?.status !== 'closed' && (isLoggedIn || user.user.payment_method_option?.id != 9)"
            type="button"
            class="btn btn-primary"
            :disabled="reportes.loading.visible"
            @click="orderService.sendOrder()"
          >
            <span v-if="reportes.loading.visible">{{ t('processing') }}</span>
            <span v-else>
              {{ isLoggedIn ? t('generate_order_link') : t('checkout') }}
            </span>
          </button>

          <button
            v-else-if="route.path == '/pay' && !reportes.loading.visible && siteStore.status?.status == 'closed' && !isLoggedIn && user.user.payment_method_option?.id == 9"
            type="button"
            class="btn btn-primary"
            :disabled="reportes.loading.visible"
            @click="pay"
          >
            <span v-if="reportes.loading.visible">{{ t('processing') }}</span>
            <span v-else>{{ t('pay_with_card') }}</span>
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
import { useUIStore } from '~/stores/ui'  
/* --- Script ePayco --- */
useHead({
  script: [
    { src: 'https://checkout.epayco.co/checkout.js', async: true, defer: true }
  ]
})

const user = useUserStore()

/* ================= i18n ================= */

const uiStore = useUIStore()

// ✅ Idioma: intenta tomarlo del uiStore (ajusta el campo si tu store usa otro nombre)
const lang = computed(() =>
  (user?.lang?.name || 'es').toString().toLowerCase() === 'en' ? 'en' : 'es'
)

// ✅ Diccionario local (puedes moverlo a tu sistema global después)
const I18N = {
  es: {
    summary: 'Resumen',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    delivery: 'Domicilio',
    total: 'Total',
    save: 'Guardar',
    change: 'Cambiar',
    go_to_store: 'Ir a la sede',
    pickup_in_store: 'Recoger en local',
    closed_opens_at: 'Cerrado, abre a las',
    back_to_menu: 'Volver al menú',
    back_to_cart: 'Volver al carrito',
    order: 'Pedir',
    checkout: 'Finalizar pedido',
    processing: 'Procesando...',
    generate_order_link: 'Generar Pedido / Link',
    pay_with_card: 'Pagar con tarjeta',
    payment_loading_try_again: 'Cargando pasarela de pagos, intenta de nuevo en un momento...'
  },
  en: {
    summary: 'Summary',
    subtotal: 'Subtotal',
    discount: 'Discount',
    delivery: 'Delivery',
    total: 'Total',
    save: 'Save',
    change: 'Change',
    go_to_store: 'Go to the store',
    pickup_in_store: 'Pick up in store',
    closed_opens_at: 'Closed, opens at',
    back_to_menu: 'Back to menu',
    back_to_cart: 'Back to cart',
    order: 'Order',
    checkout: 'Checkout',
    processing: 'Processing...',
    generate_order_link: 'Generate Order / Link',
    pay_with_card: 'Pay with card',
    payment_loading_try_again: 'Loading payment gateway, please try again in a moment...'
  }
}

const t = (key) => I18N[lang.value]?.[key] || I18N.es[key] || key

const reportes = useReportesStore()
const route = useRoute()
const store = usecartStore()
const siteStore = useSitesStore()
 
const order_id = ref('')
const epaycoPublicKey = 'ad3bfbac4531d3b82ece35e36bdf320a'

// --- LÓGICA DE LOGIN Y EDICIÓN DE DOMICILIO ---
const isEditingDelivery = ref(false)

const isLoggedIn = computed(() => {
  return !!user.user?.token && !!user.user?.inserted_by
})

const toggleEditDelivery = () => {
  isEditingDelivery.value = !isEditingDelivery.value
}

const deliveryPrice = computed({
  get: () => {
    const nb = siteStore.location?.neigborhood
    if (nb && nb.delivery_price != null) return Number(nb.delivery_price) || 0

    const ad = store.address_details || siteStore.location?.address_details
    if (ad && ad.delivery_cost_cop != null) return Number(ad.delivery_cost_cop) || 0

    const u = user.user?.site
    if (u && u.delivery_cost_cop != null) return Number(u.delivery_cost_cop) || 0

    return 0
  },
  set: (v) => {
    if (!siteStore.location.neigborhood) siteStore.location.neigborhood = {}
    siteStore.location.neigborhood.delivery_price = Math.max(0, Number(v) || 0)
  }
})

const formatName = (str) => {
  if (!str) return ''
  const lower = String(str).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

// ✅ Nombres multi-idioma (usa english_name con fallback)
const productDisplayName = (product) => {
  if (!product) return ''
  const esName = product.pedido_nombre_producto || ''
  const enName = product.english_name || ''
  return lang.value === 'en' ? (enName || esName) : esName
}

// ✅ Por si combos/adiciones también traen english_name (si no, cae al nombre normal)
const comboDisplayName = (comboItem) => {
  if (!comboItem) return ''
  const esName = comboItem.pedido_nombre || ''
  const enName = comboItem.english_name || ''
  return lang.value === 'en' ? (enName || esName) : esName
}

const additionDisplayName = (item) => {
  if (!item) return ''
  const esName = item.modificadorseleccion_nombre || ''
  const enName = item.english_name || item.modificadorseleccion_english_name || ''
  return lang.value === 'en' ? (enName || esName) : esName
}

onMounted(() => {
  if (user.user.payment_method_option?.id != 7 && !route.path.includes('reservas')) {
    siteStore.setNeighborhoodPrice()
  } else {
    siteStore.setNeighborhoodPriceCero()
  }
})

watch(() => store.cart, () => {}, { deep: true })

const pay = async () => {
  if (typeof window !== 'undefined' && !window.ePayco) {
    console.warn('El SDK de ePayco aun no ha cargado.')
    alert(t('payment_loading_try_again'))
    return
  }

  order_id.value = await orderServiceEpayco.sendOrder()
  // if (!order_id.value) return
  // payWithEpayco(order_id.value)
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
    lang: lang.value, // ✅ antes estaba fijo en 'es'
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
</script>

<style scoped>
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

.product-list::-webkit-scrollbar { width: 4px; }
.product-list::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 4px; }

.product-item {
  border-bottom: 3px dashed var(--border-color);
  padding: .5rem 0;
}
.product-item:last-child { border-bottom: none; padding-bottom: 0; }

.product-main-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 0.95rem;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.product-info { display: flex; gap: 0.5rem; }

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
.combo-list, .additions-list {
  margin-left: 1.8rem;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.combo-item, .addition-row {
  display: flex;
  justify-content: start;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.combo-qty { font-weight: 600; margin-right: 0.5rem; }
.addition-price { font-weight: 500; white-space: nowrap; margin-left: 0.5rem; }

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

.label { color: var(--text-secondary); }
.value { font-weight: 600; }

.discount { color: var(--success-text); }
.strike { text-decoration: line-through; opacity: 0.6; }
.free-delivery { color: var(--success-text); font-weight: 700; font-size: 0.8rem; }

.final-total {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 2px solid var(--border-color);
  font-size: 1.25rem;
}
.final-total .label { color: var(--text-main); font-weight: 700; }
.final-total .value { font-weight: 800; }

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
.delivery-input[type=number] {
  -moz-appearance: textfield;
}

/* --- Botones --- */
.actions-container { margin-top: 2rem; }

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
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

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

.link-wrapper { text-decoration: none; display: block; width: 100%; }

@media (max-width: 768px) {
  .summary-card {
    position: relative;
    top: 0;
    box-shadow: none;
    border: none;
    box-shadow: var(--shadow);
    padding: 1rem;
  }
  .summary-wrapper { padding: 0; margin-top: 2rem; }
  .final-total { font-size: 1.1rem; }
}
</style>
