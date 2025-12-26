<template>
  <Dialog
    style="max-width: 30rem; margin: .5rem; width: 90%;"
    modal
    v-model:visible="store.visibles.site_recoger"
  >
    <div>
      <div class="modal-body">
        <!-- ================== CIUDAD FIJA ================== -->
         
        <!-- ================== BARRIO (SOLO) ================== -->
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
        :disabled="!canSave"
        class="native-btn"
        :class="{ 'btn-disabled': !canSave }"
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
 * Como lo estás llamando así:
 * <SiteDialogRecoger :city_id="15" />
 * entonces el prop DEBE llamarse "city_id" (con underscore).
 */
const props = defineProps({
  city_id: { type: [Number, String], required: true },
})

const store = useSitesStore()

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

// ================== CONFIRM ==================
const confirmLocation = () => {
  if (!canSave.value) return

  // “recoger” -> normalmente delivery_price no aplica; lo dejo en 0 para no afectar cálculos
  store.updateLocation(
    {
      city: currentCity.value,
      neigborhood: currentNeighborhood.value, // (mantengo tu key como está en tu store)
      site: currentSite.value,
    },
    0
  )

  store.setVisible('site_recoger', false)
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

// ✅ Cuando cambia el barrio, trae la sede
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

.fixed-city-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-weight: 800;
  color: #111827;
}
.fixed-city-pill.is-loading {
  opacity: 0.8;
  font-weight: 700;
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

* {
  text-transform: uppercase;
}
</style>
