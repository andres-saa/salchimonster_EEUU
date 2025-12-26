<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <SiteDialogRecoger :city_id="15" ></SiteDialogRecoger>

    <ToastContainer />

    <CartBar />
    <MenuSearchModal />

    <!-- ✅ Botón flotante de WhatsApp (NuxtIcon) -->
    <a
     
      :href="whatsappFloatUrl"
      target="_blank"
      rel="noopener"
      class="wsp-float"
      aria-label="Abrir WhatsApp"
      title="¿Tienes dudas? Escríbenos"
    >
      <Icon size="xx-large" name="mdi:whatsapp" class="wsp-icon" />
    </a>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, nextTick, computed } from '#imports'
import { useRoute, useRouter } from '#imports'
import { useSitesStore, useUserStore, usecartStore } from '#imports'
import { useSedeFromSubdomain } from '#imports'
import SiteDialogRecoger from './components/siteDialogRecoger.vue'
import { URI } from './service/conection'

const siteStore = useSitesStore()
const userStore = useUserStore()
const cartStore = usecartStore()
const route = useRoute()
const router = useRouter()

// 🔒 lock para evitar dobles ejecuciones (por watch + replace + hooks)
let running = false
let lastKey = ''

function cleanQueryParams({ removeHash = false, removeCredentials = false, removeIframe = false } = {}) {
  const q = { ...route.query }
  let changed = false

  if (removeHash && q.hash !== undefined) {
    delete q.hash
    changed = true
  }
  if (removeCredentials) {
    if (q.inserted_by !== undefined) {
      delete q.inserted_by
      changed = true
    }
    if (q.token !== undefined) {
      delete q.token
      changed = true
    }
  }
  if (removeIframe && q.iframe !== undefined) {
    delete q.iframe
    changed = true
  }

  if (changed) router.replace({ query: q })
}

function restoreLocationFromMeta(meta) {
  if (!meta) return

  if (meta.city) siteStore.location.city = meta.city
  if (meta.mode) siteStore.location.mode = meta.mode

  if (meta.mode === 'google') {
    siteStore.location.formatted_address = meta.formatted_address || ''
    siteStore.location.place_id = meta.place_id || ''
    siteStore.location.lat = meta.lat ?? null
    siteStore.location.lng = meta.lng ?? null
    siteStore.location.address_details = meta.address_details ?? null

    const price = meta.delivery_price ?? meta.price ?? 0

    siteStore.location.neigborhood = {
      name: '',
      delivery_price: price,
      neighborhood_id: null,
      id: null,
      site_id: null
    }

    siteStore.current_delivery = price
    return
  }

  if (meta.neigborhood) {
    const nb = meta.neigborhood
    const price = nb.delivery_price ?? meta.delivery_price ?? 0

    siteStore.location.neigborhood = {
      name: nb.name || '',
      delivery_price: price,
      neighborhood_id: nb.neighborhood_id ?? nb.id ?? null,
      id: nb.id ?? nb.neighborhood_id ?? null,
      site_id: nb.site_id ?? null
    }

    siteStore.current_delivery = price
  } else {
    siteStore.location.neigborhood = {
      name: '',
      delivery_price: 0,
      neighborhood_id: null,
      id: null,
      site_id: null
    }
    siteStore.current_delivery = 0
  }
}

// ✅ helper: siempre leer subdominio “fresco”, no uno “capturado” al inicio
function getCurrentSubdomain() {
  const sede = useSedeFromSubdomain()
  return typeof sede === 'string' ? sede : sede?.value
}

async function bootstrapFromUrl(reason = 'nav') {
  if (running) return
  running = true
  try {
    const key = JSON.stringify({
      path: route.fullPath,
      hash: route.query.hash,
      inserted_by: route.query.inserted_by,
      token: route.query.token,
      iframe: route.query.iframe,
      host: process.client ? window.location.host : '',
      reason
    })
    if (key === lastKey) return
    lastKey = key

    let siteLoadedFromHash = false

    // ======================================================
    // 0) RECUPERAR SESIÓN (F5 safe)
    // ======================================================
    const storedSession = localStorage.getItem('session_external_data')
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession)
        userStore.user = { ...userStore.user, ...parsedSession }
      } catch (e) {
        console.error('Error leyendo sesión local', e)
      }
    }

    const qInsertedBy = route.query.inserted_by
    const qToken = route.query.token
    const qiframe = route.query.iframe
    const isIframe = qiframe === '1'

    if (qInsertedBy && qToken) {
      const sessionData = { inserted_by: qInsertedBy, token: qToken, iframe: isIframe }
      userStore.user = { ...userStore.user, ...sessionData }
      localStorage.setItem('session_external_data', JSON.stringify(sessionData))
    }

    // ======================================================
    // 1) CARGA POR HASH
    // ======================================================
    const hash = route.query.hash
    if (hash) {
      try {
        const response = await fetch(`${URI}/data/${hash}`)
        if (response.ok) {
          const jsonResponse = await response.json()
          const restoredData = jsonResponse?.data || {}

          if (restoredData.site_location) {
            const prevId = siteStore.location.site?.site_id ?? siteStore.location.site?.id
            const newId = restoredData.site_location?.site_id ?? restoredData.site_location?.id
            siteStore.location.site = restoredData.site_location
            if (prevId !== newId) siteStore.initStatusWatcher()
            siteLoadedFromHash = true
          }

          if (restoredData.user) {
            const currentIframeState = userStore.user.iframe
            userStore.user = {
              ...userStore.user,
              ...restoredData.user,
              iframe: currentIframeState !== undefined ? currentIframeState : restoredData.user.iframe
            }
          }

          restoreLocationFromMeta(restoredData?.location_meta)

          if (restoredData.cart) {
            const cartItems = Array.isArray(restoredData.cart) ? restoredData.cart : restoredData.cart.items || []
            if (cartItems.length > 0) {
              cartStore.cart = Array.isArray(restoredData.cart) ? restoredData.cart : restoredData.cart
            }
          }

          if (restoredData.discount) cartStore.applyCoupon(restoredData.discount)
          if (restoredData.coupon_ui && cartStore.setCouponUi) cartStore.setCouponUi(restoredData.coupon_ui)

          cleanQueryParams({
            removeHash: true,
            removeCredentials: !!(qInsertedBy && qToken),
            removeIframe: qiframe !== undefined
          })
        }
      } catch (err) {
        console.error('❌ Error restaurando hash:', err)
      }
    }

    // ======================================================
    // 2) CARGA NORMAL (Subdominio)
    // ======================================================
    if (!siteLoadedFromHash) {
      try {
        const currentSede = getCurrentSubdomain()

        if (currentSede) {
          const response = await fetch(`${URI}/sites/subdomain/${currentSede}`)
          if (response.ok) {
            const data = await response.json()
            const siteData = data?.[0] || data
            if (siteData) {
              const prevId = siteStore.location.site?.site_id ?? siteStore.location.site?.id
              const newId = siteData?.site_id ?? siteData?.id
              siteStore.location.site = siteData
              if (prevId !== newId) siteStore.initStatusWatcher()
            }
          }
        }

        const needsCredClean = !!(qInsertedBy && qToken)
        const needsIframeClean = qiframe !== undefined
        if (needsCredClean || needsIframeClean) {
          cleanQueryParams({
            removeCredentials: needsCredClean,
            removeIframe: needsIframeClean
          })
        }
      } catch (err) {
        console.error('Error cargando sede:', err)
      }
    }
  } finally {
    await nextTick()
    running = false
  }
}

function onPopState() {
  bootstrapFromUrl('popstate')
}

onMounted(() => {
  bootstrapFromUrl('mounted')
  window.addEventListener('popstate', onPopState)
})

watch(
  () => route.fullPath,
  () => bootstrapFromUrl('route-watch'),
  { flush: 'post' }
)

onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPopState)
})

/* ======================================================
   ✅ WhatsApp flotante (siteStore.location.site.site_phone)
====================================================== */
function cleanPhone(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  return digits.length >= 10 ? digits : null
}

const whatsappPhone = computed(() => cleanPhone(siteStore.location?.site?.site_phone))

const showWhatsappFloat = computed(() => {
  // si estás en iframe y no quieres mostrarlo:
  if (userStore.user?.iframe) return false
  return !!whatsappPhone.value
})

const whatsappFloatUrl = computed(() => {
  const baseUrl = 'https://api.whatsapp.com/send'
  const phone = whatsappPhone.value || ''

  const pageUrl = process.client ? window.location.href : ''
  const siteName = siteStore.location?.site?.site_name || 'la sede'

  const text = `Hola 😊 Tengo una duda con ${pageUrl ? `\n\nLink: ${pageUrl}` : ''}`

  const params = new URLSearchParams({ phone, text })
  return `${baseUrl}?${params.toString()}`
})
</script>

<style scoped>
/* ✅ Botón flotante WhatsApp */
.wsp-float {
  position: fixed;
  right: 16px;
  bottom: 96px; /* deja espacio por CartBar */
  width: 48px;
  height:48px;
  border-radius: 999px;
  background: #25d366;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
  z-index: 9999;
  transition: transform 0.12s ease, opacity 0.2s ease;
}

.wsp-float:hover {
  transform: scale(1.05);
}

.wsp-float:active {
  transform: scale(0.98);
}

/* NuxtIcon suele renderizar svg dentro */
.wsp-icon :deep(svg) {
  width: 40px;
  height: 28px;
  display: block;
}
</style>
