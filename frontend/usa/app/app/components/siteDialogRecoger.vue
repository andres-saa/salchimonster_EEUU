<template>
  <div>
    <!-- ================== OVERLAY REDIRECCIÓN (FULLSCREEN) ================== -->
    <Transition name="fade">
      <div v-if="isRedirecting" class="redirect-overlay">
        <div class="redirect-content">
          <div class="redirect-spinner">
            <span class="rocket">🚀</span>
            <div class="pulse-ring"></div>
          </div>

          <h2 class="redirect-title">Te estamos llevando a</h2>
          <h3 class="redirect-store">{{ targetSiteName || 'Nueva Sede' }}</h3>
          <p class="redirect-subtitle">Transfiriendo tu pedido...</p>
        </div>
      </div>
    </Transition>

    <!-- ================== DIALOG PICKUP ================== -->
    <Dialog
      style="max-width: 30rem; margin: .5rem; width: 90%;"
      modal
      v-model:visible="siteStore.visibles.site_recoger"
    >
      <div>
        <div class="modal-body">
          <!-- ================== BARRIO / SEDE (SOLO) ================== -->
          <div v-if="currentCity?.city_id" class="form-group fade-in">
            <label>Selecciona una sede</label>

            <div class="custom-select">
              <Select
                v-model="currentNeighborhood"
                :options="possibleNeighborhoods"
                optionLabel="name"
                placeholder="Selecciona tu sede"
                filter
                filterPlaceholder="Buscar Sede"
                :disabled="!possibleNeighborhoods.length"
                :loading="spinnersView.barrio"
                class="pv-select"
              />
            </div>

            <span v-if="spinnersView.barrio" class="loader-mini-external"></span>
          </div>

          <!-- Preview de sede -->
          <div
            class="image-preview fade-in"
            v-if="currentCity?.city_id && currentNeighborhood?.site_id"
          >
            <div style="padding: 1rem;" class="image-overlay">
              <p class="site-info">
                <span class="brand">SALCHIMONSTER - </span>
                <span class="site">{{ currentSite?.site_name || 'Cargando...' }}</span>
              </p>
              <p class="delivery-info">
                Recoger en sede : {{ currentNeighborhood?.name || '' }}
              </p>
            </div>

            <img
              v-if="currentSite?.img_id"
              :src="`${URI}/read-photo-product/${currentSite?.img_id}`"
              class="site-img"
              style="aspect-ratio: 5/3; object-fit: cover;"
              @error="handleImageError"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="confirmLocation"
          :disabled="!canSave || isRedirecting"
          class="native-btn"
          :class="{ 'btn-disabled': !canSave || isRedirecting }"
        >
          Confirmar Ubicación
        </button>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import { URI } from '@/service/conection'

// ✅ Ajusta estos imports a tu proyecto si no usas Nuxt (#imports).
// En tu checkout estás usando #imports, así que lo dejo igual.
import { useSitesStore, useUserStore, usecartStore } from '#imports'

/**
 * ✅ IMPORTANTE:
 * Como lo estás llamando así:
 * <SiteDialogRecoger :city_id="15" />
 * entonces el prop DEBE llamarse "city_id" (con underscore).
 */
const props = defineProps({
  city_id: { type: [Number, String], required: true },
})

// ================= STORES =================
const siteStore = useSitesStore()
const userStore = useUserStore()
const cartStore = usecartStore()

// ================== ESTADOS ==================
const spinnersView = ref({ ciudad: false, barrio: false })
const cities = ref([])

const currentCity = ref(null)
const currentNeighborhood = ref(null)
const possibleNeighborhoods = ref([])
const currentSite = ref({})

// cache para no pedir /sites en cada cambio
const sitesCache = ref(null)
const isReady = ref(false)

// ================= Redirect overlay =================
const isRedirecting = ref(false)
const targetSiteName = ref('')

// ================== COMPUTED ==================
const canSave = computed(() => {
  const nb = currentNeighborhood.value
  if (!currentCity.value?.city_id) return false
  if (!nb) return false
  return !!(nb.neighborhood_id || nb.id) && !!nb.site_id
})

// ================== HELPERS ==================
const handleImageError = (e) => {
  e.target.style.display = 'none'
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const getBaseDomainFromHostname = (hostname) => {
  // ej: "cali.usa.salchimonster.com" -> "usa.salchimonster.com"
  const parts = (hostname || '').split('.').filter(Boolean)
  if (parts.length <= 2) return hostname
  return parts.slice(1).join('.')
}

const getTargetUrl = (subdomain, hash) => {
  const isDev = window.location.hostname.includes('localhost')
  const protocol = window.location.protocol

  if (isDev) {
    // mismo patrón que tu checkout
    return `${protocol}//${subdomain}.localhost:3000/pay?hash=${hash}`
  }

  const baseDomain = getBaseDomainFromHostname(window.location.hostname)
  return `https://${subdomain}.${baseDomain}/pay?hash=${hash}`
}

// ================== APPLY LOCAL (MISMA SEDE) ==================
const applyPickupSelectionLocal = () => {
  // “recoger” -> delivery_price en 0 para no afectar cálculos
  siteStore.updateLocation(
    {
      city: currentCity.value,
      neigborhood: currentNeighborhood.value, // (mantengo tu key como está en tu store)
      site: currentSite.value,
    },
    0
  )

  // ✅ Sync con user (como haces en checkout cuando es pickup)
  if (userStore?.user) {
    userStore.user.site = currentSite.value
    userStore.user.address =
      currentSite.value?.site_address || currentSite.value?.site_name || ''
    userStore.user.lat = null
    userStore.user.lng = null
    userStore.user.place_id = null
  }

  // (opcional) si tu carrito guarda address_details, en pickup lo puedes limpiar
  if (cartStore) {
    cartStore.address_details = null
  }

  siteStore.setVisible('site_recoger', false)
}

// ================== REDIRECT (CAMBIO DE SEDE) ==================
const handleSiteChangePickup = async () => {
  isRedirecting.value = true
  targetSiteName.value = currentSite.value?.site_name || 'Nueva Sede'

  try {
    const hash = generateUUID()

    // ✅ payload “como el otro” (incluye order_type y demás)
    const payload = {
      user: {
        ...(userStore?.user || {}),
        order_type: userStore?.user?.order_type || null,
        payment_method_option: userStore?.user?.payment_method_option || null,

        // pickup data
        address:
          currentSite.value?.site_address ||
          currentSite.value?.site_name ||
          (userStore?.user?.address || ''),
        site: currentSite.value,
        lat: null,
        lng: null,
        place_id: null,

        pickup: {
          city: currentCity.value,
          neigborhood: currentNeighborhood.value,
          site: currentSite.value,
        },
      },

      cart: cartStore?.cart || [],

      // misma llave que en tu checkout:
      site_location: currentSite.value,

      discount: cartStore?.applied_coupon || null,
      coupon_ui: cartStore?.coupon_ui || null,
      coupon_code:
        cartStore?.applied_coupon?.code ||
        cartStore?.coupon_ui?.draft_code ||
        null,

      order_notes: cartStore?.order_notes || null,

      meta: {
        source: 'pickup_dialog',
        ts: new Date().toISOString(),
      },
    }

    await fetch(`${URI}/data/${hash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const subdomain = currentSite.value?.subdomain
    if (!subdomain) {
      alert('Lo sentimos, no pudimos localizar la dirección web de esta sede.')
      isRedirecting.value = false
      return
    }

    const targetUrl = getTargetUrl(subdomain, hash)
    window.location.href = targetUrl
  } catch (error) {
    console.error('Error switching site (pickup):', error)
    alert('Ocurrió un error al cambiar de sede. Intenta nuevamente.')
    isRedirecting.value = false
  }
}

// ================== CONFIRM ==================
const confirmLocation = async () => {
  if (!canSave.value || isRedirecting.value) return

  const currentSiteId = siteStore.location?.site?.site_id
  const newSiteId = currentSite.value?.site_id

  // Si no hay site listo, no hacemos nada
  if (!newSiteId) return

  // ✅ Si cambia de sede -> overlay + payload + redirect
  if (currentSiteId && String(currentSiteId) !== String(newSiteId)) {
    await handleSiteChangePickup()
    return
  }

  // ✅ Misma sede -> guarda y cierra
  applyPickupSelectionLocal()
}

// ================== APIs ==================
const getCities = async () => {
  spinnersView.value.ciudad = true
  try {
    const res = await fetch(`${URI}/cities`)
    cities.value = await res.json()
  } catch {
    cities.value = []
  } finally {
    spinnersView.value.ciudad = false
  }
}

const loadFixedCity = () => {
  const id = Number(props.city_id)
  currentCity.value = cities.value.find((c) => Number(c.city_id) === id) || null
}

const loadNeighborhoods = async () => {
  if (!currentCity.value?.city_id) {
    possibleNeighborhoods.value = []
    return
  }

  spinnersView.value.barrio = true
  try {
    const res = await fetch(`${URI}/neighborhoods/by-city/${currentCity.value.city_id}`)
    possibleNeighborhoods.value = await res.json()
  } catch {
    possibleNeighborhoods.value = []
  } finally {
    spinnersView.value.barrio = false
  }
}

const getSitesOnce = async () => {
  if (sitesCache.value) return sitesCache.value
  try {
    const res = await fetch(`${URI}/sites`)
    sitesCache.value = await res.json()
  } catch {
    sitesCache.value = []
  }
  return sitesCache.value
}

const loadSiteByNeighborhood = async (nb) => {
  if (!nb?.site_id) {
    currentSite.value = {}
    return
  }

  const allSites = await getSitesOnce()
  currentSite.value =
    allSites.find((s) => Number(s.site_id) === Number(nb.site_id)) || { site_name: 'Sede' }
}

// ================== LIFECYCLE ==================
onMounted(async () => {
  await getCities()
  loadFixedCity()
  await loadNeighborhoods()

  // Restore si ya existe algo guardado en esa ciudad
  if (siteStore.location?.city && Number(siteStore.location.city.city_id) === Number(props.city_id)) {
    const wantedId =
      siteStore.location.neigborhood?.neighborhood_id || siteStore.location.neigborhood?.id

    if (wantedId) {
      const match = possibleNeighborhoods.value.find(
        (n) => (n.neighborhood_id || n.id) === wantedId
      )
      if (match) currentNeighborhood.value = match
    }
  } else {
    currentNeighborhood.value = null
  }

  await nextTick()
  isReady.value = true

  // si ya había selección, carga la sede para el preview
  if (currentNeighborhood.value) {
    await loadSiteByNeighborhood(currentNeighborhood.value)
  }
})

// ✅ Si cambia el city_id (prop), recarga todo y fija la ciudad
watch(
  () => props.city_id,
  async () => {
    if (!cities.value.length) await getCities()

    currentNeighborhood.value = null
    currentSite.value = {}
    possibleNeighborhoods.value = []

    loadFixedCity()
    await loadNeighborhoods()
  }
)

// ✅ Cuando cambia la sede (nb), trae el site
watch(currentNeighborhood, async (newVal) => {
  if (!isReady.value) return
  await loadSiteByNeighborhood(newVal)
})
</script>

<style scoped>
/* ================== OVERLAY REDIRECCIÓN ================== */
.redirect-overlay {
  position: fixed;
  inset: 0;
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
}
.rocket {
  font-size: 3rem;
  z-index: 2;
  animation: rocketFloat 1.5s ease-in-out infinite alternate;
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
  font-size: 1.05rem;
  color: #64748b;
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.redirect-store {
  font-size: 2.1rem;
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
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes rocketFloat {
  from { transform: translateY(0); }
  to { transform: translateY(-10px); }
}
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ================== UI PICKUP ================== */
.custom-select {
  position: relative;
  width: 100%;
  font-family: inherit;
  user-select: none;
}
.custom-select :deep(.p-select) {
  width: 100%;
}
.custom-select :deep(.p-select:hover) {
  background: #f3f4f6;
  border-color: #d1d5db;
}
.custom-select :deep(.p-select[aria-expanded="true"]) {
  border-color: #000;
  background: #fff;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.custom-select :deep(.p-select-overlay) {
  border: 1px solid #000;
  border-top: none;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  overflow-y: visible;
}

.form-group label {
  font-weight: 700;
  font-size: 0.85rem;
  color: #374151;
  margin-bottom: 0.5rem;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loader-mini-external {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #ccc;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin-left: 5px;
}

.image-preview {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #eee;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.site-info {
  font-weight: 800;
  font-size: 1rem;
  margin: 0;
  text-transform: uppercase;
}
.delivery-info {
  font-size: 0.85rem;
  margin: 0;
  opacity: 0.9;
  margin-top: 2px;
}

.native-btn {
  background: #000;
  color: #fff;
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 0.5rem;
  font-size: 1rem;
  transition: transform 0.1s;
}
.native-btn:active {
  transform: scale(0.98);
}
.native-btn.btn-disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-in {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
