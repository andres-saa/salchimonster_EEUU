<template>
  <div class="app">
    <header class="nav">
      <div class="nav-content">
        <div class="brand">
          <div class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <line x1="16" y1="11.37" x2="16" y2="11.37"></line>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="8" y1="11.37" x2="8" y2="11.37"></line>
            </svg>
          </div>
          <div class="brand-info">
            <h1>Sidebar Posts Manager</h1>
            <div class="status-badge">
              <span class="dot" :class="{ saving: saving.isSaving }"></span>
              {{ saving.isSaving ? 'Guardando...' : 'Sincronizado' }}
            </div>
          </div>
        </div>

        <div class="store-tabs">
          <button 
            v-for="store in stores" 
            :key="store.id"
            class="tab-btn"
            :class="{ active: currentStore === store.id }"
            @click="changeStore(store.id)"
          >
            <img 
              :src="`https://flagcdn.com/24x18/${store.code}.png`" 
              :alt="store.name" 
              class="flag-img"
            />
            {{ store.name }}
          </button>
        </div>
      </div>
    </header>

    <main class="main-container">

      <section class="generator-panel">
        <div class="panel-header">
          <h2>Agregar Posts a {{ getStoreName(currentStore) }}</h2>
          <p>Sube capturas de pantalla o portadas de tus videos.</p>
        </div>

        <div class="uploader-layout">
          <div 
            class="drop-area"
            :class="{ 'dragging': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="triggerFileSelect"
          >
            <input 
              type="file" 
              ref="fileInput" 
              accept="image/*" 
              multiple
              style="display:none" 
              @change="handleFileSelect"
            />
            
            <div v-if="uploading.isUploading" class="loader-container">
              <span class="loader"></span>
              <p>Subiendo {{ uploading.current }} de {{ uploading.total }}...</p>
            </div>

            <div v-else class="drop-content">
              <div class="upload-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <p>Arrastra imágenes aquí o <span>selecciona archivos</span></p>
            </div>
          </div>

          <div class="quick-form">
             <div class="input-group">
               <label>Red Social (para este lote)</label>
               <div class="network-selector-mini">
                 <button 
                   v-for="net in networks" 
                   :key="net.id"
                   class="net-btn-mini"
                   :class="{ active: defaultNetwork === net.id }"
                   :style="{ '--net-color': net.color }"
                   @click="defaultNetwork = net.id"
                   :title="net.name"
                 >
                   <span v-html="net.icon" class="mini-svg"></span>
                 </button>
               </div>
             </div>
             
             <div class="input-group" style="margin-top: 10px">
                <label>Enlace por defecto (Opcional)</label>
                <input v-model="defaultLink" placeholder="Se aplicará a todo el lote..." />
             </div>
          </div>
        </div>
      </section>

      <div class="toolbar">
        <h3>Publicaciones Activas ({{ localPosts.length }})</h3>
        <p class="hint">Arrastra para reordenar cómo se ven en el sidebar.</p>
      </div>

      <div class="banners-grid" v-if="localPosts.length > 0">
        <div 
          v-for="(post, index) in localPosts" 
          :key="post.id"
          class="banner-card"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragenter.prevent="onDragEnter(index)"
          @dragover.prevent
          @drop="onDrop(index)"
          :class="{ 'drag-over': dragOverIndex === index }"
        >
          <div class="drag-handle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </div>

          <div class="banner-img-wrapper vertical">
            <img :src="`${IMG_BASE_URL}${post.img_identifier}`" loading="lazy" />
            <div class="img-badge" :style="{ background: getNetworkColor(post.type) }">
              <span v-html="getNetworkIcon(post.type)" class="badge-svg"></span>
            </div>
          </div>

          <div class="banner-details">
            
            <div class="details-column">
              <div class="input-group compact">
                <label>Red Social</label>
                <div class="network-tabs">
                  <button 
                    v-for="net in networks" 
                    :key="net.id"
                    class="net-tab"
                    :class="{ active: post.type === net.id }"
                    :style="post.type === net.id ? { borderColor: net.color, color: net.color, background: hexToRgba(net.color, 0.1) } : {}"
                    @click="updatePostType(post, net.id)"
                  >
                    <span class="icon" v-html="net.icon"></span>
                    {{ net.name }}
                  </button>
                </div>
              </div>

              <div class="input-group compact" style="margin-top: 10px;">
                <label>Enlace al Post / Video</label>
                <input 
                  v-model="post.to" 
                  placeholder="https://..." 
                  @blur="saveChanges"
                  @keydown.enter="$event.target.blur()"
                />
              </div>
            </div>
            
            <div class="card-actions">
              <span class="badge-idx">#{{ index + 1 }}</span>
              <button class="btn-icon danger" @click="deletePost(post.id)" title="Eliminar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-content">
          <h3>Sin posts en {{ getStoreName(currentStore) }}</h3>
          <p>Sube contenido para que aparezca en el menú lateral.</p>
        </div>
      </div>

    </main>

    <div v-if="dialog.open" class="modal-backdrop" @click.self="dialogCancel">
      <div class="modal dialog-box">
        <h3>{{ dialog.title }}</h3>
        <p>{{ dialog.message }}</p>
        <div class="d-footer">
          <button class="btn-secondary" @click="dialogCancel">Cancelar</button>
          <button class="btn-primary danger" @click="dialogConfirm">Confirmar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

// ================== CONFIGURACIÓN ==================
const DB_ID = 'sidebar_posts_v1' 
const API_URL = `https://backend.salchimonster.com/data/${DB_ID}`
const IMG_UPLOAD_URL = 'https://backend.salchimonster.com/upload-photo-product'
const IMG_BASE_URL = 'https://backend.salchimonster.com/read-photo-product/'

// Tiendas
const stores = [
  { id: 'co', code: 'co', name: 'Colombia' },
  { id: 'us', code: 'us', name: 'USA' },
  { id: 'es', code: 'es', name: 'España' }
]

// Definición de Redes Sociales (Iconos SVG inline para no depender de librerías externas en el admin)
const networks = [
  { 
    id: 'instagram', 
    name: 'Instagram', 
    color: '#E1306C',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    color: '#1877F2',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    color: '#000000',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>`
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    color: '#FF0000',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`
  }
]

// ================== ESTADO ==================
const currentStore = ref('co')
const globalData = ref({ co: [], us: [], es: [] })
const localPosts = ref([]) 
const uploading = reactive({ isUploading: false, current: 0, total: 0 })
const isDragging = ref(false)
const defaultNetwork = ref('instagram') 
const defaultLink = ref('')
const fileInput = ref(null)
const saving = reactive({ isSaving: false })
const dialog = reactive({ open: false, title: '', message: '', resolve: null })
const draggedItemIndex = ref(-1)
const dragOverIndex = ref(-1)

// ================== LOGICA DE DATOS ==================
const uuid = () => Math.random().toString(36).substring(2, 9)

const fetchData = async () => {
  try {
    const res = await fetch(API_URL).then(r => r.json())
    if (res && res.data) {
      globalData.value = {
        co: res.data.co || [],
        us: res.data.us || [],
        es: res.data.es || []
      }
    }
    syncLocalPosts()
  } catch (e) {
    console.error("Creando nueva DB para posts...", e)
  }
}

const saveData = async () => {
  saving.isSaving = true
  try {
    globalData.value[currentStore.value] = localPosts.value
    await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(globalData.value)
    })
  } catch (e) {
    alert('Error guardando datos')
  } finally {
    setTimeout(() => { saving.isSaving = false }, 800)
  }
}

const syncLocalPosts = () => {
  // Mapeamos para asegurar que siempre haya un tipo definido
  localPosts.value = (globalData.value[currentStore.value] || []).map(p => ({
    ...p,
    type: p.type || 'instagram'
  }))
}

const changeStore = (storeId) => {
  currentStore.value = storeId
  syncLocalPosts()
}

// Helpers
const getStoreName = (id) => stores.find(s => s.id === id)?.name
const getNetworkColor = (id) => networks.find(n => n.id === id)?.color || '#ccc'
const getNetworkIcon = (id) => networks.find(n => n.id === id)?.icon || ''
const hexToRgba = (hex, alpha) => {
  let c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
      c = hex.substring(1).split('');
      if(c.length === 3) c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      c = '0x'+c.join('');
      return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
  }
  return hex;
}

const updatePostType = (post, type) => {
  post.type = type
  saveChanges()
}

// ================== SUBIDA DE ARCHIVOS ==================
const triggerFileSelect = () => fileInput.value.click()

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  if (files.length > 0) processFiles(files)
  e.target.value = '' 
}

const handleDrop = (e) => {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  if (files.length > 0) processFiles(files)
}

const processFiles = async (files) => {
  uploading.isUploading = true
  uploading.total = files.length
  uploading.current = 0

  let newItems = []

  try {
    for (const file of files) {
      uploading.current++
      const fd = new FormData()
      fd.append('file', file)
      
      const res = await fetch(IMG_UPLOAD_URL, { method: 'POST', body: fd }).then(r => r.json())
      
      if (res && res.image_identifier) {
        newItems.push({
          id: uuid(),
          img_identifier: res.image_identifier,
          to: defaultLink.value || '', 
          type: defaultNetwork.value, // Usa la red seleccionada en el panel
          createdAt: new Date().toISOString()
        })
      }
    }

    if (newItems.length > 0) {
      localPosts.value.push(...newItems)
      await saveData()
      defaultLink.value = '' // Limpiar link después de subir
    }

  } catch (e) {
    alert('Error al subir imagen')
    console.error(e)
  } finally {
    uploading.isUploading = false
  }
}

// ================== DRAG AND DROP (Sortable) ==================
const onDragStart = (index) => { draggedItemIndex.value = index }
const onDragEnter = (index) => { dragOverIndex.value = index }

const onDrop = async (index) => {
  const draggedIdx = draggedItemIndex.value
  if (draggedIdx === -1 || draggedIdx === index) return

  const itemToMove = localPosts.value[draggedIdx]
  localPosts.value.splice(draggedIdx, 1)
  localPosts.value.splice(index, 0, itemToMove)

  draggedItemIndex.value = -1
  dragOverIndex.value = -1
  await saveData()
}

// ================== ELIMINAR ==================
const saveChanges = () => saveData()

const deletePost = async (id) => {
  const confirm = await new Promise(resolve => {
    dialog.open = true
    dialog.title = 'Eliminar Post'
    dialog.message = '¿Seguro que deseas eliminar esta publicación?'
    dialog.resolve = resolve
  })
  
  if (confirm) {
    localPosts.value = localPosts.value.filter(p => p.id !== id)
    await saveData()
  }
  dialog.open = false
}

const dialogConfirm = () => dialog.resolve && dialog.resolve(true)
const dialogCancel = () => { dialog.resolve && dialog.resolve(false); dialog.open = false }

onMounted(() => fetchData())
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:global(:root) {
  --primary: #4f46e5;
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --danger: #ef4444;
  --success: #10b981;
}

.app {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-page);
  min-height: 100vh;
  color: var(--text-main);
  padding-bottom: 4rem;
  margin-top: 3rem;
}

/* ===== NAVBAR ===== */
.nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255,255,255,0.9); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.nav-content {
  max-width: 1000px; margin: 0 auto; padding: 0.75rem 1rem;
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
}
.brand { display: flex; align-items: center; gap: 0.75rem; }
.logo-icon {
  width: 36px; height: 36px; background: var(--text-main); color: white;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
}
.brand-info h1 { font-size: 1.1rem; font-weight: 700; margin: 0; }
.status-badge { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.dot { width: 6px; height: 6px; background: var(--success); border-radius: 50%; }
.dot.saving { background: #eab308; animation: pulse 1s infinite; }

/* TABS TIENDAS */
.store-tabs {
  display: flex; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 8px;
}
.tab-btn {
  border: none; background: transparent; padding: 6px 16px; border-radius: 6px;
  font-size: 0.9rem; font-weight: 600; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; gap: 8px; transition: all 0.2s;
}
.tab-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.5); }
.tab-btn.active { background: white; color: var(--primary); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.flag-img { width: 20px; height: auto; border-radius: 2px; box-shadow: 0 0 1px rgba(0,0,0,0.2); }

/* ===== MAIN ===== */
.main-container { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }

/* ===== GENERATOR PANEL ===== */
.generator-panel {
  background: var(--bg-card); border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid var(--border);
  overflow: hidden; margin-bottom: 2rem;
}
.panel-header { padding: 1.5rem; border-bottom: 1px solid var(--border); background: #fff; }
.panel-header h2 { margin: 0; font-size: 1.25rem; }
.panel-header p { margin: 4px 0 0; color: var(--text-muted); font-size: 0.9rem; }

.uploader-layout { display: flex; padding: 1.5rem; gap: 1.5rem; }
.drop-area {
  flex: 1; border: 2px dashed var(--border); border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  min-height: 140px; cursor: pointer; transition: 0.2s; background: #f8fafc;
}
.drop-area:hover, .drop-area.dragging { border-color: var(--primary); background: #eef2ff; }
.drop-content { text-align: center; color: var(--text-muted); }
.drop-content span { color: var(--primary); font-weight: 600; text-decoration: underline; }
.upload-icon { margin-bottom: 0.5rem; color: var(--text-muted); }

.quick-form { width: 300px; display: flex; flex-direction: column; justify-content: center; }
.input-group label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem; }
input {
  width: 100%; height: 40px; border: 1px solid var(--border); border-radius: 8px;
  padding: 0 12px; font-size: 0.9rem; background: white; box-sizing: border-box;
}
input:focus { border-color: var(--primary); outline: none; }

/* Selectores de Red Social (Upload) */
.network-selector-mini { display: flex; gap: 8px; }
.net-btn-mini {
  width: 36px; height: 36px; border-radius: 50%; border: 2px solid transparent;
  display: flex; align-items: center; justify-content: center;
  background: white; color: var(--text-muted); cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s;
}
.net-btn-mini:hover { transform: scale(1.05); }
.net-btn-mini.active { border-color: var(--net-color); color: white; background: var(--net-color); transform: scale(1.1); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
.mini-svg { width: 16px; height: 16px; display: block; }
.net-btn-mini.active .mini-svg { stroke: white; }

/* ===== LISTADO ===== */
.toolbar { margin-bottom: 1rem; }
.toolbar h3 { margin: 0; font-size: 1.1rem; }
.hint { color: var(--text-muted); font-size: 0.85rem; margin: 4px 0 0; }

.banners-grid { display: flex; flex-direction: column; gap: 1rem; }

.banner-card {
  display: flex; align-items: center; background: white;
  border: 1px solid var(--border); border-radius: 12px; padding: 1rem;
  gap: 1.5rem; transition: transform 0.2s, box-shadow 0.2s;
}
.banner-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.banner-card.drag-over { border: 2px dashed var(--primary); background: #eef2ff; }

.drag-handle { cursor: grab; color: #cbd5e1; padding: 0.5rem; }
.drag-handle:hover { color: var(--text-main); }

/* IMAGEN VERTICAL (POSTS) */
.banner-img-wrapper.vertical {
  width: 96px; height: 120px; /* Ratio 4:5 aprox */
  flex-shrink: 0; background: #f1f5f9; position: relative;
  border-radius: 8px; overflow: hidden; border: 1px solid var(--border);
}
.banner-img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.img-badge {
  position: absolute; bottom: 4px; right: 4px; width: 22px; height: 22px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: white; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.badge-svg { width: 12px; height: 12px; stroke-width: 3; }

.banner-details { flex: 1; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.details-column { flex: 1; }

/* TABS RED SOCIAL EN TARJETA */
.network-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.net-tab {
  border: 1px solid var(--border); background: white; padding: 6px 12px;
  border-radius: 20px; display: flex; align-items: center; gap: 6px;
  font-size: 0.75rem; font-weight: 600; color: var(--text-muted); cursor: pointer;
  transition: all 0.2s;
}
.net-tab:hover { background: #f8fafc; border-color: #cbd5e1; }
.net-tab .icon { width: 14px; height: 14px; display: flex; }

.card-actions { display: flex; align-items: center; gap: 1rem; }
.badge-idx { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }

.btn-icon {
  width: 36px; height: 36px; border: 1px solid var(--border); background: white;
  border-radius: 8px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center;
}
.btn-icon.danger:hover { background: #fee2e2; color: var(--danger); border-color: #fee2e2; }

.empty-state { padding: 4rem; text-align: center; background: white; border-radius: 16px; border: 1px dashed var(--border); }
.empty-content h3 { margin: 0 0 0.5rem; color: var(--text-main); }
.empty-content p { color: var(--text-muted); margin: 0; }

.loader-container { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--primary); font-size: 0.9rem; font-weight: 600; }
.loader { width: 24px; height: 24px; border: 3px solid #e0e7ff; border-bottom-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { background: white; padding: 2rem; border-radius: 16px; width: 400px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal h3 { margin-top: 0; }
.d-footer { margin-top: 2rem; display: flex; justify-content: center; gap: 1rem; }
.btn-secondary { background: white; border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-primary.danger { background: var(--danger); border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }

@media (max-width: 768px) {
  .uploader-layout { flex-direction: column; }
  .quick-form { width: 100%; }
  .banner-card { flex-direction: column; align-items: stretch; gap: 1rem; }
  .banner-img-wrapper.vertical { width: 100%; height: 250px; }
  .banner-details { flex-direction: column; align-items: stretch; }
  .card-actions { justify-content: space-between; margin-top: 1rem; }
  .network-tabs { justify-content: flex-start; }
  .net-tab { flex: 1; justify-content: center; }
}
</style>