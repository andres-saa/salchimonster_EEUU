<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import { useSitesStore } from '#imports'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  activeCategoryId: { type: [Number, String, null], default: null }
})

const emit = defineEmits(['select-category'])
const containerRef = ref(null)
const siteStore = useSitesStore()

// ✅ 1. Lógica de estado
const isOpen = computed(() => {
  const st = siteStore.status
  if (!st) return false
  if (typeof st === 'string') return st === 'open'
  return st.status === 'open'
})

// ✅ 2. Scroll Logic
const isPinned = ref(true)
const lastScrollY = ref(0)
const ticking = ref(false)

const handleScroll = () => {
  if (typeof window === 'undefined') return
  if (!ticking.value) {
    window.requestAnimationFrame(() => {
      performScrollLogic()
      ticking.value = false
    })
    ticking.value = true
  }
}

const performScrollLogic = () => {
  const currentY = window.scrollY || window.pageYOffset || 0
  const delta = currentY - lastScrollY.value
  
  if (Math.abs(delta) < 10) return 

  // Umbral más alto para evitar parpadeos
  if (delta > 0 && currentY > 60) {
    isPinned.value = false
  } else {
    isPinned.value = true
  }
  lastScrollY.value = currentY
}

// ✅ 3. Calculamos la posición TOP dinámica (Teletransporte)
const categoriesBarTop = computed(() => {
  if (!isPinned.value) return '0px' // Pegado arriba del todo
  return isOpen.value ? '3.6rem' : '5.7rem' // En su posición original
})

const formatLabel = (str) => {
  const s = String(str || '').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const onClickCategory = (category) => emit('select-category', category)

const centerActiveCategoryPill = () => {
  const container = containerRef.value
  if (!container || !props.activeCategoryId) return
  const activeEl = container.querySelector(`[data-cat-pill-id="${props.activeCategoryId}"]`)
  if (!activeEl) return

  const targetScrollLeft = activeEl.offsetLeft + activeEl.offsetWidth / 2 - container.clientWidth / 2
  container.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' })
}

watch(() => props.activeCategoryId, () => {
  nextTick(() => centerActiveCategoryPill())
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    lastScrollY.value = window.scrollY || 0
    window.addEventListener('scroll', handleScroll, { passive: true })
    centerActiveCategoryPill()
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <div 
    :key="isPinned"
    class="menu-categories-bar fade-in-teleport"
    :style="{ top: categoriesBarTop }"
  >
    <div class="menu-categories-bar__scroll" ref="containerRef">
      <button
        v-for="cat in categories"
        :key="cat.category_id"
        class="menu-categories-bar__item"
        :class="{ 'menu-categories-bar__item--active': cat.category_id == activeCategoryId }"
        :data-cat-pill-id="cat.category_id"
        @click="onClickCategory(cat)"
      >
        <img 
          v-if="cat.products[0]?.productogeneral_urlimagen"
          class="menu-categories-bar__img"
          :src="`https://img.restpe.com/${cat.products[0]?.productogeneral_urlimagen}`" 
          alt=""
        > 
        <span class="menu-categories-bar__text">{{ formatLabel(cat.category_name) }}</span>   
      </button>
    </div>
  </div>
</template>

<style scoped>
.menu-categories-bar {
  position: sticky;
  z-index: 99;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  
  /* IMPORTANTE: Eliminamos 'transition: top' para que no deslice. 
     Solo dejamos transiciones de efectos visuales si fueran necesarios */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  will-change: opacity, transform;
}

/* CLASE PARA LA ANIMACIÓN DE TELETRANSPORTE 
   Esta animación se ejecuta cada vez que cambia el :key (isPinned)
*/
.fade-in-teleport {
  animation: teleportAppear 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes teleportAppear {
  0% {
    opacity: 0;
    transform: translateY(-5px) scale(0.98); /* Entra ligeramente desde arriba y un poco más pequeño */
  }
  50% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.menu-categories-bar__scroll {
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;
}
.menu-categories-bar__scroll::-webkit-scrollbar { display: none; }

.menu-categories-bar__item {
  padding: 0.4rem 0.8rem;
  display: flex;
  align-items: center;
  border-radius: 99px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #374151;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, transform 0.1s;
  white-space: nowrap;
  flex-shrink: 0;
  user-select: none; 
  -webkit-tap-highlight-color: transparent;
}

.menu-categories-bar__text { padding-left: 0.5rem; }

.menu-categories-bar__img {
  height: 1.5rem;
  width: 1.5rem;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.menu-categories-bar__item:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
  transform: translateY(-1px);
}

.menu-categories-bar__item:active {
  transform: translateY(0px);
}

.menu-categories-bar__item--active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

@media (max-width: 768px) {
  .menu-categories-bar__scroll { padding: 0.75rem; gap: 0.6rem; }
  .menu-categories-bar__item { padding: 0.5rem 1rem; font-size: 1rem; }
  .menu-categories-bar__img { height: 1.8rem; width: 1.8rem; }
}
</style>