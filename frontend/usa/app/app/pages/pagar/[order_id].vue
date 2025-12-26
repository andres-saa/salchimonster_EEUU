<template>
  <ClientOnly>
    <div class="page-container">
      <!-- ===== Recibo ===== -->
      <div v-if="order && order.order_id" class="receipt-card">
        <header class="receipt-header">
          <h2 class="client-name">
            🤩 {{ (order.pe_json?.cliente?.cliente_nombres || '').toUpperCase() }}
            {{ (order.pe_json?.cliente?.cliente_apellidos || '').toUpperCase() }} 🤩
          </h2>
          <p class="subtitle-msg">👇 CONFIRMA TU PEDIDO AQUÍ 👇</p>
        </header>

        <div class="receipt-body">
          <!-- ===== Meta ===== -->
          <div class="order-meta-section">
            <div class="order-id-box">
              <span class="label">ORDEN ID:</span>
              <span class="value">{{ order.order_id }}</span>
            </div>

            <div class="order-dates">
              <p>
                {{ order.user_name }} {{ order.second_name }}
                {{ order.first_last_name }} {{ order.second_last_name }}
              </p>
              <small>
                <b>Fecha:</b> {{ (order.latest_status_timestamp || '').split('T')[0] }} |
                <b>Hora:</b> {{ (order.latest_status_timestamp || '').split('T')[1]?.split(':').slice(0,2).join(':') }}
              </small>
            </div>
          </div>

          <!-- ===== Productos ===== -->
          <div class="products-section">
            <div class="table-header">
              <span>PRODUCTOS</span>
              <span>TOTAL</span>
            </div>

            <div class="table-body">
              <div
                v-for="(product, idx) in order.pe_json?.listaPedidos"
                :key="idx"
                class="product-item-group"
              >
                <div class="product-row">
                  <div class="product-desc">
                    <span v-if="order.site_id === 32">
                      <b>({{ product.pedido_cantidad }} kg)</b> {{ product.pedido_nombre_producto }}
                    </span>
                    <span v-else>
                      <b>({{ product.pedido_cantidad }})</b> {{ product.pedido_nombre_producto }}
                    </span>
                  </div>
                  <div class="product-total">
                    {{ formatCurrency((product.pedido_base_price || product.pedido_precio) * product.pedido_cantidad) }}
                  </div>
                </div>

                <div v-if="product.lista_productocombo?.length" class="details-block">
                  <p class="details-title">COMBO INCLUYE:</p>
                  <p v-for="(c, k) in product.lista_productocombo" :key="k" class="detail-item">
                    -- <b>{{ c.pedido_cantidad }}</b> {{ c.pedido_nombre }}
                  </p>
                </div>

                <div v-if="product.modificadorseleccionList?.length" class="details-block">
                  <div v-for="(mod, m) in product.modificadorseleccionList" :key="m" class="modifier-row">
                    <span class="detail-item">
                      - ({{ product.pedido_cantidad }}) <b>{{ mod.modificadorseleccion_cantidad }}</b> {{ mod.modificadorseleccion_nombre }}
                    </span>
                    <span class="modifier-price">
                      {{ formatCurrency(mod.pedido_precio * mod.modificadorseleccion_cantidad * product.pedido_cantidad) }}
                    </span>
                  </div>
                </div>

                <div class="separator"></div>
              </div>
            </div>
          </div>

          <!-- ===== Totales ===== -->
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal</span>
              <b>{{ formatCurrency(calcSubtotal()) }}</b>
            </div>

            <div v-if="(order.pe_json?.delivery?.total_descuento || 0) > 0" class="total-row discount-text">
              <span>Descuento</span>
              <b>- {{ formatCurrency(order.pe_json.delivery.total_descuento) }}</b>
            </div>

            <div class="total-row">
              <span>Domicilio</span>
              <b>{{ formatCurrency(order.pe_json?.delivery?.delivery_costoenvio) }}</b>
            </div>

            <div class="total-row final-total">
              <span>TOTAL A PAGAR</span>
              <span>{{ formatCurrency(order.pe_json?.delivery?.delivery_pagocon) }}</span>
            </div>
          </div>

          <!-- ===== Info Cliente ===== -->
          <div class="info-section">
            <div class="section-header">DATOS DEL CLIENTE</div>
            <div class="info-grid">
              <div class="info-row">
                <span class="label">Nombre:</span>
                <span class="val">{{ order.user_name }} {{ order.first_last_name }}</span>
              </div>

              <div class="info-row" v-if="order.cedula_nit">
                <span class="label">CC/NIT:</span>
                <span class="val">{{ order.cedula_nit }}</span>
              </div>

              <div class="info-row">
                <span class="label">Teléfono:</span>
                <span class="val">{{ order.user_phone }}</span>
              </div>

              <div class="info-row" v-if="order.order_type !== 'Pasar a recoger'">
                <span class="label">Dirección:</span>
                <span class="val capitalize">{{ (order.user_address || '').toLowerCase() }}</span>
              </div>

              <div class="info-row">
                <span class="label">Método Pago:</span>
                <span class="val capitalize">{{ (order.payment_method || '').toLowerCase() }}</span>
              </div>

              <div class="info-row">
                <span class="label">Entrega:</span>
                <span class="val">{{ order.order_type }}</span>
              </div>

              <div class="info-notes" v-if="order.order_notes">
                <span class="label">Notas:</span>
                <p class="notes-text">{{ (order.order_notes).toLowerCase() }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== Footer ===== -->
        <footer class="receipt-footer">
          <a :href="whatsappUrl" target="_blank" class="full-width-link">
            <button class="btn btn-whatsapp">
              <i class="pi pi-whatsapp"></i>Dudas?
            </button>
          </a>

          <button
            @click="pay"
            class="btn btn-pay"
            :disabled="loadingPay || isCreatingPI"
          >
            <i class="pi" :class="(loadingPay || isCreatingPI) ? 'pi-spin pi-spinner' : 'pi-credit-card'"></i>
            {{ (loadingPay || isCreatingPI) ? 'Procesando...' : 'Pagar' }}
          </button>
        </footer>
      </div>

      <!-- ===== Loading / Error ===== -->
      <div v-else class="loading-state">
        <div v-if="isLoading" class="spinner"></div>
        <h2 v-if="isLoading">Cargando pedido...</h2>
        <h2 v-else class="error-msg">No se encontró el pedido o hubo un error.</h2>
      </div>

      <!-- ===== Stripe Dialog (MODAL) ===== -->
      <!-- Asume que PrimeVue Dialog está disponible (global o importado). -->
      <Dialog
        v-model:visible="stripeDialogVisible"
        modal
        :closable="!isConfirming"
        :dismissableMask="!isConfirming"
        :draggable="false"
        appendTo="body"
        style="width: min(520px, 95vw)"
        @hide="onStripeDialogHide"
      >
        <template #header>
          <div class="dialog-header">
            <span class="dialog-title">PAGAR CON TARJETA</span>
          </div>
        </template>

        <div class="stripe-card">
          <div ref="paymentMountRef" id="payment-element" class="payment-element"></div>

          <small class="muted">Tus datos se procesan de forma segura con Stripe.</small>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <div class="stripe-actions">
            <button
              class="btn btn-pay"
              :disabled="isConfirming || !isFormReady"
              @click="confirmStripePayment"
            >
              <span v-if="isConfirming">Confirmando...</span>
              <span v-else>Pagar</span>
            </button>

            <button
              class="btn btn-cancel"
              :disabled="isConfirming"
              @click="cancelStripeForm"
            >
              CANCELAR
            </button>
          </div>
        </div>
      </Dialog>
      <!-- ===== /Stripe Dialog ===== -->
    </div>
  </ClientOnly>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from "vue";
import { useRoute, useRuntimeConfig } from "#imports";
import { loadStripe } from "@stripe/stripe-js";
import { URI, SELF_URI } from "~/service/conection";

// Si NO tienes Dialog global, descomenta e importa:
// import Dialog from "primevue/dialog";

// ===== Runtime Config =====
const config = useRuntimeConfig();
const stripeApiBase = config.public.stripeApiBase || "https://api.stripe.salchimonster.com";
const DEFAULT_CURRENCY = (config.public.stripeCurrency || "usd").toLowerCase();

// ===== Estado =====
const route = useRoute();
const isLoading = ref(true);
const loadingPay = ref(false);

const order = ref(null);

// Stripe UI state
const isCreatingPI = ref(false);
const isConfirming = ref(false);
const stripeDialogVisible = ref(false);
const errorMessage = ref("");
const clientSecret = ref("");
const isFormReady = ref(false);

// Stripe instances
const elements = ref(null);
const paymentElement = ref(null);
const lastStripe = ref(null);
const paymentMountRef = ref(null);

// ===== Utils =====
const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value || 0);
};

const calcSubtotal = () => {
  const d = order.value?.pe_json?.delivery || {};
  const pagocon = Number(d.delivery_pagocon || 0);
  const envio = Number(d.delivery_costoenvio || 0);
  const desc = Number(d.total_descuento || 0);
  return (pagocon + desc - envio);
};

// ===== Stripe helpers =====
const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"
]);

const toMinor = (amountMajor, currency) => {
  const c = (currency || "").toLowerCase();
  return ZERO_DECIMAL.has(c) ? Math.round(amountMajor) : Math.round(amountMajor * 100);
};

const stripeCache = new Map();
const getStripeByKey = async (pk) => {
  if (!pk) return null;
  if (!stripeCache.has(pk)) stripeCache.set(pk, loadStripe(pk));
  return await stripeCache.get(pk);
};

// Site actual (multi-tenant)
const currentSiteId = computed(() => {
  return (
    order.value?.site_id ||
    order.value?.pe_json?.delivery?.local_id ||
    ""
  );
});

// ===== Carga orden =====
onMounted(async () => {
  const orderId = route.params.order_id || route.query.order_id;
  if (!orderId) { isLoading.value = false; return; }

  try {
    const data = await $fetch(`${URI}/order-by-id/${orderId}`);
    if (data && data.order_id) order.value = data;
  } catch (err) {
    console.error("Error cargando pedido:", err);
  } finally {
    isLoading.value = false;
  }
});

// ===== WhatsApp =====
const whatsappUrl = computed(() => {
  const baseUrl = "https://api.whatsapp.com/send";
  let phone = 573053447255;

  if (order.value?.order_id) {
    const prefix = order.value.order_id.split("-")[0];
    if (["NEW", "NEK", "FIL", "NYK"].includes(prefix)) phone = 13477929350;
  }

  const params = new URLSearchParams({
    phone: String(phone),
    text: `Hola, tengo dudas sobre el pago de mi orden #${order.value?.order_id || ""}`
  });
  return `${baseUrl}?${params.toString()}`;
});

// ===== Pagar con Stripe (abre el MODAL) =====
const pay = async () => {
  if (!order.value?.order_id) return;
  if (stripeDialogVisible.value || isCreatingPI.value) return;

  errorMessage.value = "";
  loadingPay.value = true;

  const siteId = String(currentSiteId.value || "").trim();
  if (!siteId) {
    errorMessage.value = "No se detectó la sede (site).";
    loadingPay.value = false;
    return;
  }

  const totalAPagar = Number(order.value?.pe_json?.delivery?.delivery_pagocon || 0);
  if (!(totalAPagar > 0)) {
    errorMessage.value = "Total inválido para el pago.";
    loadingPay.value = false;
    return;
  }

  isCreatingPI.value = true;

  try {
    // 1) Crear PaymentIntent en tu backend (multi-tenant)
    const url = `${stripeApiBase}/create-payment-intent?site=${encodeURIComponent(siteId)}`;
    const currency = DEFAULT_CURRENCY;
    const amountMinor = toMinor(totalAPagar, currency);

    const data = await $fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site": siteId
      },
      body: {
        amount: amountMinor,
        currency,
        metadata: {
          order_id: order.value.order_id,
          site_id: siteId,
          user_id: order.value?.user_id || ""
        }
      }
    });

    clientSecret.value = data?.clientSecret || "";
    const publishableKey = data?.publishableKey || config.public.stripePublishableKey;

    if (!clientSecret.value || !publishableKey) {
      throw new Error("Stripe no inicializó correctamente (faltan keys).");
    }

    // 2) Abrir el modal y montar Payment Element dentro
    stripeDialogVisible.value = true;
    await nextTick();

    const stripe = await getStripeByKey(publishableKey);
    if (!stripe) throw new Error("Stripe no inicializó correctamente.");

    lastStripe.value = stripe;

    // limpiar mounts anteriores
    try { paymentElement.value?.unmount(); } catch {}

    elements.value = stripe.elements({
      clientSecret: clientSecret.value,
      appearance: { theme: "stripe" }
    });

    paymentElement.value = elements.value.create("payment");
    paymentElement.value.mount("#payment-element");

    isFormReady.value = true;
  } catch (err) {
    console.error("Error iniciando pago con Stripe:", err);
    errorMessage.value = err?.data?.detail || err?.message || "No se pudo iniciar el pago.";
    cancelStripeForm(); // cierra y limpia
  } finally {
    isCreatingPI.value = false;
    loadingPay.value = false;
  }
};

// ===== Confirmar pago =====
const confirmStripePayment = async () => {
  try {
    errorMessage.value = "";
    if (!isFormReady.value || !elements.value || !lastStripe.value) {
      throw new Error("El formulario de pago aún no está listo. Intenta de nuevo.");
    }

    isConfirming.value = true;

    const { error } = await lastStripe.value.confirmPayment({
      elements: elements.value,
      confirmParams: {
        return_url: `${SELF_URI}/gracias-stripe?order_id=${order.value.order_id}`
      }
    });

    if (error) {
      errorMessage.value = error.message || "No se pudo confirmar el pago.";
      isConfirming.value = false;
    }
  } catch (err) {
    console.error("Error al confirmar el pago:", err);
    errorMessage.value = err?.message || "Error inesperado al confirmar.";
    isConfirming.value = false;
  }
};

// Si el usuario cierra el Dialog (X o mask), limpiamos (si no está confirmando)
const onStripeDialogHide = () => {
  if (isConfirming.value) return; // por si acaso
  cancelStripeForm(false); // ya está oculto, solo limpiar
};

// ===== Cancelar / limpiar Stripe =====
// closeDialog = true por defecto (para botón CANCELAR)
const cancelStripeForm = (closeDialog = true) => {
  try { paymentElement.value?.unmount(); } catch {}
  paymentElement.value = null;
  elements.value = null;
  lastStripe.value = null;

  isFormReady.value = false;
  isConfirming.value = false;
  clientSecret.value = "";

  const el = document.getElementById("payment-element");
  if (el) el.innerHTML = "";

  if (closeDialog) stripeDialogVisible.value = false;
};

onBeforeUnmount(() => {
  try { paymentElement.value?.unmount(); } catch {}
});
</script>

<style scoped>
/* Reset */
* { box-sizing: border-box; }

/* --- Layout --- */
.page-container {
  min-height: 100vh;
  background-color: #f3f4f6;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* --- Recibo --- */
.receipt-card {
  background: #fff;
  width: 100%;
  max-width: 480px;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  position: relative;
  margin-bottom: 2rem;
}

.receipt-card::before {
  content: "";
  position: absolute;
  top: -5px;
  left: 0;
  width: 100%;
  height: 5px;
  background: radial-gradient(circle, transparent, transparent 50%, #fff 50%, #fff 100%)
    -7px -8px / 16px 16px repeat-x;
}

/* --- Header --- */
.receipt-header {
  padding: 2rem 1rem 1rem;
  text-align: center;
  border-bottom: 2px dashed #eee;
}

.client-name {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: #111;
  line-height: 1.2;
}

.subtitle-msg {
  font-size: 1rem;
  font-weight: 700;
  color: #444;
  margin: 0;
}

/* --- Body --- */
.receipt-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* --- Meta --- */
.order-meta-section { text-align: center; }
.order-id-box {
  background: #f3f4f6;
  display: inline-block;
  padding: 0.3rem 1rem;
  border-radius: 4px;
  font-weight: 800;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}
.order-dates { font-size: 0.85rem; color: #555; }
.order-dates p { margin: 0; font-weight: 600; font-size: 1rem; color: #000; }

/* --- Tabla productos --- */
.table-header {
  background: #000;
  color: #fff;
  padding: 0.5rem 0.75rem;
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: 4px 4px 0 0;
}

.table-body {
  border: 1px solid #eee;
  border-top: none;
  padding: 0.5rem;
}

.product-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
}

.product-desc { line-height: 1.3; flex: 1; padding-right: 0.5rem; }
.product-total { font-weight: 600; white-space: nowrap; }

.details-block {
  padding-left: 1rem;
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 0.25rem;
}
.details-title { font-weight: 700; font-size: 0.75rem; margin: 0.2rem 0; }
.detail-item { margin: 0; }

.modifier-row { display: flex; justify-content: space-between; }
.separator { height: 1px; background: #eee; margin: 0.5rem 0; }

/* --- Totales --- */
.totals-section {
  border-top: 2px solid #000;
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.total-row { display: flex; justify-content: space-between; font-size: 0.95rem; }
.final-total { font-size: 1.25rem; font-weight: 800; margin-top: 0.5rem; }
.discount-text { color: #dc2626; }

/* --- Información Cliente --- */
.info-section { margin-top: 0.5rem; }
.section-header {
  background: #000;
  color: #fff;
  font-weight: 700;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}
.info-grid { display: grid; gap: 0.5rem; font-size: 0.9rem; }
.info-row { display: grid; grid-template-columns: 100px 1fr; align-items: baseline; }
.info-row .label { font-weight: 700; color: #444; }
.info-notes { margin-top: 0.5rem; }
.notes-text { margin: 0; }
.capitalize { text-transform: capitalize; }

/* ===== Dialog header ===== */
.dialog-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-title {
  font-weight: 900;
  letter-spacing: 0.5px;
}

/* --- Stripe card (dentro del modal) --- */
.stripe-card {
 
  background: #fff;
  border-radius: 0.75rem;
  padding: 0rem;
}

.payment-element { margin-bottom: 0.75rem; }
.muted { color: #666; display: block; margin-top: 0.25rem; }
.error { color: #444; margin: 0.75rem 0 0; font-weight: 600; }

.stripe-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

/* --- Footer --- */
.receipt-footer {
  padding: 1.5rem;
  background: #f9fafb;
  border-top: 1px solid #eee;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  border-radius: 0 0 0.75rem 0.75rem;
}
.full-width-link { flex: 1; text-decoration: none; }

/* --- Botones --- */
.btn {
  border: none;
  border-radius: 0.5rem;
  padding: 1rem;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  transition: transform 0.1s;
  text-transform: uppercase;
}
.btn:active { transform: scale(0.98); }

.btn-whatsapp { background-color: #25D366; color: #fff; }
.btn-pay { background-color: #000; color: #fff; flex: 1; }
.btn-pay:disabled { background-color: #555; cursor: not-allowed; }
.btn-cancel {
  background: #e5e7eb;
  color: #111;
  flex: 1;
}
.btn-cancel:disabled { opacity: 0.7; cursor: not-allowed; }

/* --- Loading / Error --- */
.loading-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 80vh;
  width: 100%;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #ddd;
  border-top: 4px solid #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-msg { color: #dc2626; font-weight: 800; text-align: center; }
</style>
