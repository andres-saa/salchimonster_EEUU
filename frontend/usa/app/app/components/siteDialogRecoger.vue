<template>
  <Dialog
    style="max-width: 30rem; margin: .5rem; width: 90%;"
    modal
    v-model:visible="store.visibles.site_recoger"
  >
    <!-- OVERLAY REDIRECCIÓN -->
    <Transition name="fade">
      <div v-if="isRedirecting" class="redirect-overlay">
        <div class="redirect-content">
          <div class="redirect-spinner">
            <span class="rocket">🚀</span>
            <div class="pulse-ring"></div>
          </div>

          <h2 class="redirect-title">Te estamos llevando a</h2>
          <h3 class="redirect-store">{{ targetSiteName || 'Nueva sede' }}</h3>
          <p class="redirect-subtitle">Transfiriendo tu ubicación...</p>
        </div>
      </div>
    </Transition>

    <div>
      <div class="modal-body">
        <!-- ================== BARRIO / SEDE ================== -->
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
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import { useSitesStore } from '@/stores/site'
import { URI } from '@/service/conection'

/**
 * ✅ IMPORTANTE:
 * <SiteDialogRecoger :city_id="15" />
 */
const props = defineProps({
  city_id: { type: [Number, String], required: true },
})

const store = useSitesStore()

/* ================== CONFIG DOMINIO ================== */
const MAIN_DOMAIN = 'salchimonster.com'

/* ================== ESTADOS ================== */
const spinnersView = ref({ ciudad: false, barrio: false })
const cities = ref([])

const currentCity = ref(null)
const currentNeighborhood = ref(null)
const possibleNeighborhoods = ref([])
const currentSite = ref({})

// cache para no pedir /sites en cada cambio
const sitesCache = ref(null)

const isReady = ref(false)

/* ================== REDIRECCIÓN (overlay) ================== */
const isRedirecting = ref(false)
const targetSiteName = ref('')

/* ================== COMPUTED ================== */
const canSave = computed(() => {
  const nb = currentNeighborhood.value
  if (!currentCity.value?.city_id) return false
  if (!nb) return false
  return !!(nb.neighborhood_id || nb.id) && !!nb.site_id
})

/* ================== HELPERS ================== */
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

const getCurrentSubdomain = () => {
  try {
    const host = window.location.hostname || ''
    // dev: newark.localhost
    if (host.endsWith('localhost')) {
      const parts = host.split('.')
      return parts.length >= 2 ? parts[0] : ''
    }

    // prod: newark.salchimonster.com
    if (host.endsWith(MAIN_DOMAIN)) {
      const parts = host.split('.')
      // ["newark","salchimonster","com"] => "newark"
      return parts.length >= 3 ? parts[0] : ''
    }

    return ''
  } catch {
    return ''
  }
}

const buildTargetUrl = (subdomain, hash) => {
  const isDev =
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1')

  // Mantener ruta actual (si quieres siempre ir a "/", cambia currentPath a "/")
  const currentPath =
    window.location.pathname + window.location.search + window.location.hash

  if (isDev) {
    // ejemplo: newark.localhost:3000
    const base = `${window.location.protocol}//${subdomain}.localhost:3000`
    const url = new URL(currentPath || '/', base)
    url.searchParams.set('hash', hash)
    return url.toString()
  }

  // prod
  const base = `https://${subdomain}.${MAIN_DOMAIN}`
  const url = new URL(currentPath || '/', base)
  url.searchParams.set('hash', hash)
  return url.toString()
}

const saveTransferPayload = async (hash, payload) => {
  // mismo patrón de /data/{hash} que ya usas en checkout
  await fetch(`${URI}/data/${hash}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

const redirectToSite = async (targetSite) => {
  const subdomain = targetSite?.subdomain
  if (!subdomain) return // si no hay subdominio configurado, no redirigimos

  const currentSub = getCurrentSubdomain()
  if (currentSub && currentSub.toLowerCase() === String(subdomain).toLowerCase()) {
    // ya estás en el subdominio correcto
    return
  }

  isRedirecting.value = true
  targetSiteName.value = targetSite?.site_name || 'Nueva sede'

  try {
    const hash = generateUUID()

    const nb = currentNeighborhood.value || {}
    const nbName = nb.name || nb.neighborhood_name || ''

    const cleanNeighborhood = {
      ...nb,
      name: nbName,
      id: nb.id || nb.neighborhood_id,
      neighborhood_id: nb.neighborhood_id || nb.id,
      delivery_price: nb.delivery_price,
    }

    const payload = {
      kind: 'pickup_location',
      created_at: new Date().toISOString(),
      from_url: window.location.href,
      site_location: targetSite,
      location_meta: {
        city: currentCity.value,
        neigborhood: cleanNeighborhood,
      },
    }

    await saveTransferPayload(hash, payload)

    const targetUrl = buildTargetUrl(subdomain, hash)
    window.location.href = targetUrl
  } catch (e) {
    console.error('Redirection error:', e)
    isRedirecting.value = false
  }
}

/* ================== CONFIRM ================== */
const confirmLocation = async () => {
  if (!canSave.value) return

  // “recoger” -> delivery_price en 0 para no afectar cálculos
  store.updateLocation(
    {
      city: currentCity.value,
      neigborhood: currentNeighborhood.value, // (mantengo tu key como está en tu store)
      site: currentSite.value,
    },
    0
  )

  // ✅ cerrar modal (igual vamos a redirigir si aplica)
  store.setVisible('site_recoger', false)

  // ✅ redirigir al subdominio de la sede
  await redirectToSite(currentSite.value)
}

/* ================== APIs ================== */
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
    allSites.find((s) => Number(s.site_id) === Number(nb.site_id)) || {
      site_name: 'Sede',
    }
}

/* ================== LIFECYCLE ================== */
onMounted(async () => {
  await getCities()
  loadFixedCity()
  await loadNeighborhoods()

  // Restore si ya existe algo guardado
  if (store.location?.city && Number(store.location.city.city_id) === Number(props.city_id)) {
    const wantedId =
      store.location.neigborhood?.neighborhood_id || store.location.neigborhood?.id

    if (wantedId) {
      const match = possibleNeighborhoods.value.find(
        (n) => (n.neighborhood_id || n.id) === wantedId
      )
      if (match) currentNeighborhood.value = match
    }
  } else {
    currentNeighborhood.value = null
  }

  isReady.value = true
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

// ✅ Cuando cambia la sede (barrio), trae el site
watch(currentNeighborhood, async (newVal) => {
  if (!isReady.value) return
  await loadSiteByNeighborhood(newVal)
})
</script>

<style scoped>
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
  to {
    transform: rotate(360deg);
  }
}
.fade-in {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* OVERLAY REDIRECCIÓN */
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
  margin-bottom: 1.2rem;
}
.rocket {
  font-size: 2.5rem;
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
  border: 2px solid #000;
  opacity: 0;
  animation: pulse 2s infinite;
}
.redirect-title {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.redirect-store {
  font-size: 1.7rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0.4rem 0 0.2rem;
  line-height: 1.1;
  max-width: 90vw;
}
.redirect-subtitle {
  font-size: 0.95rem;
  color: #94a3b8;
  margin-top: 0.6rem;
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

/* si NO quieres todo en mayúscula, borra esto */
* {
  text-transform: uppercase;
}
</style>
