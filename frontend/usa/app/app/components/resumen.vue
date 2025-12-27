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
          <span class="label">{{ t('subtotal') }}</span>
          <span class="value">{{ formatoPesosColombianos(store.cartSubtotal) }}</span>
        </div>

        <div class="total-row" v-if="store.cartTotalDiscount > 0">
          <span class="label discount">{{ t('discount') }}</span>
          <span class="value discount">- {{ formatoPesosColombianos(store.cartTotalDiscount) }}</span>
        </div>

        <!-- ✅ DOMICILIO: NUNCA 0 SI ES DELIVERY -->
        <div class="total-row" v-if="siteStore?.location?.site?.site_id != 33">
          <div class="label-wrapper">
            <span class="label">{{ t('delivery') }}</span>

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
              <input
                type="number"
                class="delivery-input"
                v-model="deliveryEditRaw"
                :min="isPickup ? 0 : 1"
                inputmode="numeric"
              />
              <div v-if="deliveryError" class="field-error" style="margin-top:.35rem;">
                {{ deliveryError }}
              </div>
            </div>

            <div v-else>
              <!-- Pickup / estoy en sede => 0 permitido -->
              <template v-if="isPickup">
                <span class="free-delivery">
                  {{ route.path.includes('reservas') ? t('go_to_store') : t('pickup_in_store') }}
                </span>
              </template>

              <!-- Delivery => debe ser >0 -->
              <template v-else-if="deliveryPrice != null && deliveryPrice > 0">
                {{ formatoPesosColombianos(deliveryPrice) }}
              </template>

              <!-- Delivery inválido (0 / null) -->
              <template v-else>
                <span class="free-delivery" style="color:#b91c1c;">
                  {{ t('delivery_required') }}
                </span>
              </template>
            </div>
          </div>
        </div>

        <div class="total-row final-total">
          <span class="label">{{ t('total') }}</span>
          <span class="value">
            <template v-if="canProceed">
              {{ formatoPesosColombianos(totalToPay) }}
            </template>
            <template v-else>
              --
            </template>
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

        <!-- ✅ Aviso extra si no puede proceder por domicilio inválido -->
        <div
          v-if="!canProceed"
          class="closed-alert"
          style="background:#fff7ed; color:#9a3412; border:1px solid #fed7aa;"
        >
          <i class="pi pi-exclamation-triangle"></i>
          {{ t('delivery_required') }}
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

          <!-- Nota: dejé tu condición tal cual venía -->
          <NuxtLink
            to="/pay"
            v-if="route.path.includes('cart') && (siteStore.status?.status !== 'closed' && route.path == '/reservas')"
            class="link-wrapper"
          >
            <button type="button" class="btn btn-primary" :disabled="!canProceed">
              {{ t('order') }}
            </button>
          </NuxtLink>

          <!-- /cart -> /pay: bloquear si falta domicilio en delivery -->
          <template v-if="route.path == '/cart'">
            <NuxtLink v-if="canProceed" to="/pay" class="link-wrapper">
              <button type="button" class="btn btn-primary">
                {{ t('checkout') }}
              </button>
            </NuxtLink>

            <button v-else type="button" class="btn btn-primary" disabled>
              {{ t('checkout') }}
            </button>
          </template>

          <!-- /pay: enviar orden (bloquear si falta domicilio en delivery) -->
          <button
            v-else-if="
              route.path == '/pay' &&
              !reportes.loading.visible &&
              siteStore.status?.status !== 'closed' &&
              (isLoggedIn || user.user.payment_method_option?.id != 9)
            "
            type="button"
            class="btn btn-primary"
            :disabled="reportes.loading.visible || !canProceed"
            @click="orderService.sendOrder()"
          >
            <span v-if="reportes.loading.visible">{{ t('processing') }}</span>
            <span v-else>
              {{ isLoggedIn ? t('generate_order_link') : t('checkout') }}
            </span>
          </button>

          <!-- /pay: pagar con tarjeta (bloquear si falta domicilio en delivery) -->
          <button
            v-else-if="
              route.path == '/pay' &&
              !reportes.loading.visible &&
              siteStore.status?.status  !== 'closed' &&
              !isLoggedIn &&
              user.user.payment_method_option?.id == 9
            "
            type="button"
            class="btn btn-primary"
            :disabled="reportes.loading.visible || !canProceed"
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
  script: [{ src: 'https://checkout.epayco.co/checkout.js', async: true, defer: true }]
})

const user = useUserStore()
const uiStore = useUIStore()
const reportes = useReportesStore()
const route = useRoute()
const store = usecartStore()
const siteStore = useSitesStore()

const order_id = ref('')
const epaycoPublicKey = 'ad3bfbac4531d3b82ece35e36bdf320a'

/* ================= i18n ================= */
const lang = computed(() =>
  (user?.lang?.name || 'es').toString().toLowerCase() === 'en' ? 'en' : 'es'
)

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
    payment_loading_try_again: 'Cargando pasarela de pagos, intenta de nuevo en un momento...',
    delivery_required: 'Selecciona una dirección válida para calcular el domicilio (no puede ser $0).',
    invalid_delivery_value: 'En delivery el domicilio debe ser mayor a 0.'
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
    payment_loading_try_again: 'Loading payment gateway, please try again in a moment...',
    delivery_required: 'Select a valid address to calculate delivery (it cannot be $0).',
    invalid_delivery_value: 'For delivery, the fee must be greater than 0.'
  }
}
const t = (key) => I18N[lang.value]?.[key] || I18N.es[key] || key

/* ================= Reglas: Pickup vs Delivery ================= */
const isPickup = computed(() => [2, 6].includes(Number(user.user.order_type?.id)))
const isDelivery = computed(() => !isPickup.value)

const isValidDeliveryCost = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0
}
const normalizeDeliveryCost = (v) => (isValidDeliveryCost(v) ? Number(v) : null)

/* ================= LOGIN & EDICIÓN DOMICILIO ================= */
const isEditingDelivery = ref(false)
const deliveryEditRaw = ref('') // string para input
const deliveryError = ref('')

const isLoggedIn = computed(() => {
  return !!user.user?.token && !!user.user?.inserted_by
})

const deliveryPrice = computed({
  get: () => {
    // 1) neighborhood
    const nb = siteStore.location?.neigborhood
    const nbVal = nb?.delivery_price

    // 2) address_details
    const ad = store.address_details || siteStore.location?.address_details
    const adVal = ad?.delivery_cost_cop

    // 3) user.site
    const u = user.user?.site
    const uVal = u?.delivery_cost_cop

    // Pickup => 0 siempre
    if (isPickup.value) return 0

    // Delivery => solo >0, si no => null
    const candidate = nbVal ?? adVal ?? uVal ?? null
    return normalizeDeliveryCost(candidate)
  },
  set: (v) => {
    if (!siteStore.location.neigborhood) siteStore.location.neigborhood = {}
    if (isPickup.value) {
      siteStore.location.neigborhood.delivery_price = 0
      siteStore.current_delivery = 0
      return
    }
    const normalized = normalizeDeliveryCost(v)
    siteStore.location.neigborhood.delivery_price = normalized
    siteStore.current_delivery = normalized
  }
})

const toggleEditDelivery = () => {
  deliveryError.value = ''

  // Entrando a edición: precarga el valor actual
  if (!isEditingDelivery.value) {
    deliveryEditRaw.value =
      deliveryPrice.value != null ? String(deliveryPrice.value) : ''
    isEditingDelivery.value = true
    return
  }

  // Guardando
  const typed = Number(deliveryEditRaw.value)
  if (isPickup.value) {
    deliveryPrice.value = 0
    isEditingDelivery.value = false
    return
  }

  if (!isValidDeliveryCost(typed)) {
    deliveryError.value = t('invalid_delivery_value')
    return
  }

  deliveryPrice.value = typed
  isEditingDelivery.value = false
}

/* ================= Totales / Candado de pago ================= */
const canProceed = computed(() => {
  // pickup => ok (0 permitido)
  if (isPickup.value) return true
  // delivery => debe existir y ser >0
  return deliveryPrice.value != null && deliveryPrice.value > 0
})

const totalToPay = computed(() => {
  const d = isPickup.value ? 0 : (deliveryPrice.value ?? 0)
  return store.cartTotal + d
})

/* ================= Nombres multi-idioma ================= */
const formatName = (str) => {
  if (!str) return ''
  const lower = String(str).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

const productDisplayName = (product) => {
  if (!product) return ''
  const esName = product.pedido_nombre_producto || ''
  const enName = product.english_name || ''
  return lang.value === 'en' ? (enName || esName) : esName
}

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

/* ================= Init domicilio (sin dejarlo en 0 si es delivery) ================= */
onMounted(() => {
  if (isPickup.value) {
    siteStore.setNeighborhoodPriceCero()
  } else {
    // evita que quede 0: si el store pone 0 por default, luego el computed lo vuelve null
    siteStore.setNeighborhoodPrice()
  }
})

watch(
  () => user.user.order_type?.id,
  () => {
    // si cambia a pickup => fuerza 0
    if (isPickup.value) {
      deliveryPrice.value = 0
      return
    }
    // si cambia a delivery y estaba 0 => deja null (no puede proceder)
    if (deliveryPrice.value === 0) {
      deliveryPrice.value = null
    }
  },
  { immediate: true }
)

watch(() => store.cart, () => {}, { deep: true })

/* ================= Pagos ================= */
const pay = async () => {
  if (!canProceed.value) {
    alert(t('delivery_required'))
    return
  }

  if (typeof window !== 'undefined' && !window.ePayco) {
    console.warn('El SDK de ePayco aun no ha cargado.')
    alert(t('payment_loading_try_again'))
    return
  }

  order_id.value = await orderServiceEpayco.sendOrder()
}

const payWithEpayco = (id) => {
  if (!canProceed.value) {
    alert(t('delivery_required'))
    return
  }

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

  const totalAPagar = totalToPay.value

  handler.open({
    name: id,
    description: `Pedido ${id}`,
    amount: totalAPagar,
    currency: siteStore?.location?.site?.time_zone === 'America/New_York' ? 'usd' : 'cop',
    invoice: id,
    country: 'co',
    lang: lang.value,
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

.field-error {
  font-size: 0.8rem;
  color: #b91c1c;
  display: block;
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
