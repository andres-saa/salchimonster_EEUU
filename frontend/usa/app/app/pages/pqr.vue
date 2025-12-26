<template>
  <div class="monster-ayuda-page">
    <!-- ================== DIALOG: Solicitud recibida ================== -->
    <Transition name="dialog">
      <div v-if="visibleDialog" class="dialog-overlay">
        <div class="dialog-custom">
          <div class="dialog-header">
            <Icon name="mdi:check-circle" class="dialog-header-icon" />
            <h3 class="dialog-header-title">{{ t('dialog_received_title') }}</h3>
          </div>
          <div class="dialog-content">
            <p class="dialog-text">
              {{ t('dialog_received_text') }}
            </p>
            <p class="last-id">{{ last_id }}</p>

            <NuxtLink to="/" class="dialog-link">
              <button class="btn btn-primary" type="button">
                <Icon name="mdi:check-circle-outline" class="btn-icon" />
                {{ t('ok') }}
              </button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================== DIALOG: Gracias ================== -->
    <Transition name="dialog">
      <div v-if="visibleDialogGRacias" class="dialog-overlay">
        <div class="dialog-custom">
          <div class="dialog-header dialog-header--success">
            <Icon name="mdi:emoticon-happy-outline" class="dialog-header-icon" />
            <h3 class="dialog-header-title">{{ t('dialog_thanks_title') }}</h3>
          </div>
          <div class="dialog-content">
            <p class="gracias-message">{{ t('dialog_thanks_msg') }}</p>

            <NuxtLink to="/" class="dialog-link">
              <button class="btn btn-primary" type="button">
                <Icon name="mdi:check-circle-outline" class="btn-icon" />
                {{ t('ok') }}
              </button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================== DIALOG: Error ================== -->
    <Transition name="dialog">
      <div v-if="visibleErrorDialog" class="dialog-overlay">
        <div class="dialog-custom">
          <div class="dialog-header dialog-header--error">
            <Icon name="mdi:alert-circle-outline" class="dialog-header-icon" />
            <h3 class="dialog-header-title">{{ t('dialog_error_title') }}</h3>
          </div>
          <div class="dialog-content">
            <p class="dialog-text">{{ errorMessage }}</p>

            <button
              class="btn btn-primary"
              type="button"
              @click="visibleErrorDialog = false"
            >
              <Icon name="mdi:close" class="btn-icon" />
              {{ t('understood') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <main class="main-wrapper">
      <section class="card animate-entry">
        <header class="card-header">
          <div class="card-title-group">
            <h1 class="title">
              🔥 <b>{{ t('monster_help') }}</b> 🔥
            </h1>
            <p class="subtitle">
              {{ t('subtitle') }}
            </p>
          </div>

          <img
            src="https://www.salchimonster.com/images/kids/3.png"
            :alt="t('img_alt')"
            class="main-image"
          />
        </header>

        <div v-if="pending" class="form-skeleton">
          <div class="skeleton skeleton-text" style="width: 40%"></div>
          <div class="skeleton skeleton-input"></div>

          <div class="skeleton skeleton-text" style="width: 30%; margin-top: 1rem"></div>
          <div class="skeleton skeleton-input"></div>

          <div class="skeleton skeleton-text" style="width: 20%; margin-top: 1rem"></div>
          <div class="skeleton skeleton-input" style="height: 100px"></div>

          <div class="form-grid" style="margin-top: 1rem">
            <div class="skeleton skeleton-input"></div>
            <div class="skeleton skeleton-input"></div>
            <div class="skeleton skeleton-input"></div>
            <div class="skeleton skeleton-input"></div>
          </div>
        </div>

        <div v-else class="form-container fade-in">
          <!-- ================== Tipo ================== -->
          <div class="form-group">
            <label class="field-label">
              {{ t('how_can_we_help') }}
              <span class="field-required">*</span>
            </label>
            <select
              class="input input-select input-uppercase"
              v-model.number="selectedType"
            >
              <option value="" disabled>{{ t('select_option') }}</option>
              <option
                v-for="tp in apiData.types.filter(tp => tp.show_on_web)"
                :key="tp.id"
                :value="tp.id"
              >
                <!-- Si tu backend ya trae name en español, aquí lo dejamos.
                     Si luego quieres multiidioma real por tipo, se mapea por id. -->
                {{ tp.name }}
              </option>
            </select>
          </div>

          <!-- ================== Tag (si aplica) ================== -->
          <Transition name="slide-fade">
            <div class="form-group" v-if="selectedType && selectedType !== 8">
              <label class="field-label">
                {{ t('classify_issue') }}
                <span class="field-required">*</span>
              </label>
              <select
                class="input input-select"
                v-model.number="selectedTagId"
              >
                <option value="" disabled>{{ t('select_option') }}</option>
                <option v-for="tag in apiData.tags" :key="tag.id" :value="tag.id">
                  {{ tag.name }}
                </option>
              </select>

              <div v-if="currentTag" class="tag-preview">
                <span class="tag-circle" :style="{ backgroundColor: currentTag.color }"></span>
                <span class="tag-name">{{ currentTag.name }}</span>
              </div>
            </div>
          </Transition>

          <!-- ================== Sede ================== -->
          <Transition name="slide-fade">
            <div class="form-group" v-if="selectedType">
              <label class="field-label">
                {{ t('site') }}
                <span class="field-required">*</span>
              </label>
              <select
                class="input input-select"
                v-model.number="selecteSite"
              >
                <option value="" disabled>{{ t('select_site') }}</option>
                <option
                  v-for="s in apiData.sites.filter(s => s.show_on_web && s.time_zone == 'America/Bogota')"
                  :key="s.site_id"
                  :value="s.site_id"
                >
                  {{ s.site_name }}
                </option>
              </select>
            </div>
          </Transition>

          <!-- ================== Order ID (solo tipo 9) ================== -->
          <div class="form-group" v-if="selectedType === 9">
            <label class="field-label">
              {{ t('order_id') }}
              <span class="field-hint">{{ t('order_id_hint') }} <b>BRE-0554</b></span>
              <span class="field-required">*</span>
            </label>
            <input
              v-model="orderId"
              class="input"
              type="text"
              :placeholder="t('order_id_placeholder')"
            />
          </div>

          <!-- ================== Rating (solo tipo 8) ================== -->
          <div class="form-group rating-section" v-if="selectedType === 8">
            <label class="field-label">
              {{ t('rate_us') }}
              <span class="field-required">*</span>
            </label>
            <div class="rating-stars">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="star-button"
                :class="{ active: rating >= star }"
                @click="rating = star"
              >
                <Icon
                  :name="rating >= star ? 'mdi:star' : 'mdi:star-outline'"
                  class="star-icon"
                />
              </button>
            </div>
          </div>

          <!-- ================== Comentarios ================== -->
          <Transition name="slide-fade">
            <div class="form-group" v-if="selectedType">
              <label class="field-label">
                {{ t('comments') }}
                <span v-if="selectedType !== 8" class="field-required">*</span>
              </label>
              <textarea
                v-model="comments"
                rows="4"
                class="input textarea"
                :placeholder="t('comments_placeholder')"
              ></textarea>
            </div>
          </Transition>

          <!-- ================== Datos usuario ================== -->
          <Transition name="slide-fade">
            <div class="form-grid" v-if="selectedType">
              <div class="form-group">
                <label class="field-label">
                  {{ t('name') }}
                  <span v-if="selectedType !== 8" class="field-required">*</span>
                </label>
                <input
                  v-model="userName"
                  class="input"
                  type="text"
                  :placeholder="t('name_placeholder')"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  {{ t('phone') }}
                  <span v-if="selectedType !== 8" class="field-required">*</span>
                </label>
                <input
                  v-model="userPhone"
                  class="input"
                  type="tel"
                  :placeholder="t('phone_placeholder')"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  {{ t('email') }}
                  <span v-if="selectedType !== 8" class="field-required">*</span>
                </label>
                <input
                  v-model="userEmail"
                  class="input"
                  type="email"
                  :placeholder="t('email_placeholder')"
                />
              </div>

              <div class="form-group">
                <label class="field-label">
                  {{ t('address') }}
                  <span v-if="selectedType !== 8" class="field-required">*</span>
                </label>
                <input
                  v-model="userAddress"
                  class="input"
                  type="text"
                  :placeholder="t('address_placeholder')"
                />
              </div>
            </div>
          </Transition>

          <div class="form-footer">
            <p class="form-note">
              <span class="field-required">*</span> {{ t('required_fields') }}
            </p>
            <button
              class="btn btn-primary"
              type="button"
              @click="handleSubmit"
              :disabled="sending"
            >
              <Icon v-if="sending" name="mdi:loading" class="btn-icon spin" />
              <Icon v-else name="mdi:send" class="btn-icon" />
              {{ sending ? t('sending') : t('send_request') }}
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '#imports'
import { URI } from '~/service/conection'

const userStore = useUserStore()

/* ================= i18n ================= */
const lang = computed(() =>
  (userStore?.lang?.name || 'es').toString().toLowerCase() === 'en' ? 'en' : 'es'
)

const DICT = {
  es: {
    monster_help: 'MONSTER AYUDA',
    subtitle: 'Cada día trabajamos para darte una mejor experiencia.',
    img_alt: 'Monster Ayuda',

    how_can_we_help: '¿Cómo te podemos ayudar?',
    select_option: 'Selecciona una opción',
    classify_issue: 'Clasifica tu inconveniente',
    site: 'Sede',
    select_site: 'Selecciona una sede',

    order_id: 'ID de la orden',
    order_id_hint: 'Ejemplo:',
    order_id_placeholder: 'Escribe el número de la orden',

    rate_us: 'Califícanos',

    comments: 'Comentarios',
    comments_placeholder: 'Cuéntanos qué sucedió o cómo fue tu experiencia',

    name: 'Nombre',
    name_placeholder: 'Escribe tu nombre',

    phone: 'Número de teléfono',
    phone_placeholder: 'Celular o número de contacto',

    email: 'Correo electrónico',
    email_placeholder: 'Escribe tu correo',

    address: 'Dirección',
    address_placeholder: 'Dirección donde ocurrió el servicio',

    required_fields: 'Campos obligatorios',
    sending: 'Enviando...',
    send_request: 'Enviar solicitud',

    // dialogs
    dialog_received_title: 'Solicitud recibida',
    dialog_received_text: 'Hemos recibido tu solicitud y ha quedado registrada con el ID:',
    dialog_thanks_title: '¡Gracias por tu calificación!',
    dialog_thanks_msg: 'Muchas gracias 💛',
    dialog_error_title: 'Revisa tu información',

    ok: 'Listo',
    understood: 'Entendido',

    // errors
    err_select_type: 'Por favor, selecciona un tipo de requerimiento.',
    err_order_id: 'Por favor, ingresa el ID de la orden.',
    err_select_tag: 'Por favor, clasifica tu inconveniente.',
    err_comments: 'Por favor, cuéntanos lo sucedido.',
    err_user_fields: 'Por favor, completa los campos obligatorios: nombre, teléfono, dirección y correo electrónico.',
    err_select_site: 'Por favor, selecciona la sede.',
    err_rating: 'Por favor, selecciona una calificación.',
    err_submit: 'Hubo un error al enviar tu solicitud. Inténtalo de nuevo.'
  },
  en: {
    monster_help: 'MONSTER HELP',
    subtitle: 'Every day we work to give you a better experience.',
    img_alt: 'Monster Help',

    how_can_we_help: 'How can we help you?',
    select_option: 'Select an option',
    classify_issue: 'Classify your issue',
    site: 'Site',
    select_site: 'Select a site',

    order_id: 'Order ID',
    order_id_hint: 'Example:',
    order_id_placeholder: 'Type your order ID',

    rate_us: 'Rate us',

    comments: 'Comments',
    comments_placeholder: 'Tell us what happened or how your experience was',

    name: 'Name',
    name_placeholder: 'Type your name',

    phone: 'Phone number',
    phone_placeholder: 'Mobile or contact number',

    email: 'Email',
    email_placeholder: 'Type your email',

    address: 'Address',
    address_placeholder: 'Address where the service happened',

    required_fields: 'Required fields',
    sending: 'Sending...',
    send_request: 'Send request',

    // dialogs
    dialog_received_title: 'Request received',
    dialog_received_text: 'We received your request and it has been registered with ID:',
    dialog_thanks_title: 'Thanks for your rating!',
    dialog_thanks_msg: 'Thank you so much 💛',
    dialog_error_title: 'Check your information',

    ok: 'Done',
    understood: 'Got it',

    // errors
    err_select_type: 'Please select a request type.',
    err_order_id: 'Please enter the order ID.',
    err_select_tag: 'Please classify your issue.',
    err_comments: 'Please tell us what happened.',
    err_user_fields: 'Please complete the required fields: name, phone, address and email.',
    err_select_site: 'Please select the site.',
    err_rating: 'Please select a rating.',
    err_submit: 'There was an error submitting your request. Please try again.'
  }
}

const t = (key) => DICT[lang.value]?.[key] || DICT.es[key] || key

/* ================= UI State ================= */
const visibleDialog = ref(false)
const visibleDialogGRacias = ref(false)
const visibleErrorDialog = ref(false)
const errorMessage = ref('')
const sending = ref(false)
const last_id = ref('')

/* ================= Form State ================= */
const selectedType = ref(null)
const selecteSite = ref(null)
const selectedTagId = ref(null)
const orderId = ref('')
const userName = ref('')
const userPhone = ref('')
const userEmail = ref('')
const userAddress = ref('')
const comments = ref('')
const rating = ref(0)

/* ================= Data Fetch (SSR) ================= */
const { data: apiData, pending } = await useAsyncData(
  'monster-help-data',
  async () => {
    const [types, sites, tags] = await Promise.all([
      $fetch(`${URI}/get-all-pqrs-types`),
      $fetch(`${URI}/sites`),
      $fetch(`${URI}/get-all-pqr-tags`)
    ])
    return { types: types || [], sites: sites || [], tags: tags || [] }
  },
  {
    lazy: true,
    server: true,
    default: () => ({ types: [], sites: [], tags: [] })
  }
)

/* ================= Computed ================= */
const currentTag = computed(() => {
  if (!apiData.value?.tags) return null
  return apiData.value.tags.find((tg) => tg.id === selectedTagId.value) || null
})

/* Default selectedType (tu lógica original, pero segura) */
watch(
  () => pending.value,
  (isPending) => {
    if (!isPending && apiData.value?.types?.length) {
      if (selectedType.value == null) selectedType.value = 9
    }
  },
  { immediate: true }
)

/* ================= Helpers ================= */
const showError = (msg) => {
  errorMessage.value = msg
  visibleErrorDialog.value = true
}

/* ================= Submit ================= */
const handleSubmit = async () => {
  if (sending.value) return

  if (!selectedType.value) return showError(t('err_select_type'))
  if (selectedType.value === 9 && !orderId.value) return showError(t('err_order_id'))
  if (selectedType.value !== 8 && !selectedTagId.value) return showError(t('err_select_tag'))
  if (selectedType.value !== 8 && !comments.value) return showError(t('err_comments'))

  if (selectedType.value !== 8 && (!userName.value || !userPhone.value || !userAddress.value || !userEmail.value)) {
    return showError(t('err_user_fields'))
  }

  if (!selecteSite.value) return showError(t('err_select_site'))
  if (selectedType.value === 8 && !rating.value) return showError(t('err_rating'))

  sending.value = true

  const payload = {
    data: {
      reques_type_id: selectedType.value,
      content: comments.value || (lang.value === 'en' ? 'No comments' : 'Sin comentarios'),
      channel_id: 1,
      rating: rating.value || null,
      site_id: selecteSite.value || null,
      order_id: orderId.value || null,
      network_id: 4,
      tag_id: selectedTagId.value || 7,
      restaurant_id: 1
    },
    user: {
      user_name: userName.value || '',
      user_phone: userPhone.value?.toString() || '',
      user_address: userAddress.value || '',
      site_id: selecteSite.value || null,
      email: userEmail.value || ''
    }
  }

  try {
    const res = await $fetch(`${URI}/create-pqr`, {
      method: 'POST',
      body: payload
    })

    last_id.value = res?.pqr_id?.[0]?.id || ''

    if (selectedType.value === 8) {
      visibleDialogGRacias.value = true
    } else {
      visibleDialog.value = true
    }
  } catch (err) {
    console.error('Error al enviar:', err)
    showError(t('err_submit'))
  } finally {
    sending.value = false
  }
}
</script>


<style scoped>
:root {
  --monster-primary: #ffca28;
  --monster-primary-strong: #ff9800;
  --monster-bg: #f5f5f7;
  --monster-text: #222;
  --monster-muted: #6b7280;
}

/* LAYOUT GENERAL */
.monster-ayuda-page {
  position: relative;
  min-height: 100vh;
  background: var(--monster-bg);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 3rem 1rem;
  box-sizing: border-box;
}

.main-wrapper {
  width: 100%;
  max-width: 900px;
}

/* ANIMACIÓN ENTRADA CARD */
.animate-entry {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* CARD PRINCIPAL */
.card {
  background-color: #ffffff;
  border-radius: .3rem;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.17), 0 0 0 1px rgba(148, 163, 184, 0.12);
  padding: 2rem;
  backdrop-filter: blur(6px);
  min-height: 400px; /* Evita colapso visual */
}

/* SKELETON LOADER STYLES */
.form-skeleton {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-top: 1rem;
}

.skeleton {
    background: #e2e8f0;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
}

.skeleton-text {
    height: 1.2rem;
    margin-bottom: 0.5rem;
}

.skeleton-input {
    height: 42px;
    width: 100%;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* HEADER CARD */
.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.3);
  padding-bottom: 1.5rem;
}

.title {
  margin: 0;
  font-size: 1.8rem;
  line-height: 1.2;
  color: #111827;
}

.subtitle {
  margin-top: 0.4rem;
  font-size: 0.98rem;
  color: var(--monster-muted);
}

.main-image {
  width: 160px;
  max-width: 40%;
}

/* FORMULARIO */
.form-container {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* TRANSICIÓN DE APARICIÓN SUAVE DEL FORM */
.fade-in {
    animation: fadeIn 0.4s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* TRANSICIONES VUE (SLIDE FADE) */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.field-required {
  color: #ef4444;
  font-size: 0.8rem;
}

.field-hint {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--monster-muted);
}

/* INPUTS GENERALES */
.input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 0.55rem;
  border: 1px solid rgba(148, 163, 184, 0.7);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  background-color: #f9fafb;
}

.input:focus {
  border-color: var(--monster-primary-strong);
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.3);
  background-color: #ffffff;
}

.input-select {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #9ca3af 50%), linear-gradient(135deg, #9ca3af 50%, transparent 50%);
  background-position: calc(100% - 14px) calc(50% - 3px), calc(100% - 8px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.input-uppercase { text-transform: uppercase; }
.textarea { min-height: 100px; resize: vertical; }

/* GRID DATOS PERSONALES */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.25rem;
}

/* TAG PREVIEW */
.tag-preview {
  margin-top: 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background-color: rgba(15, 23, 42, 0.03);
}

.tag-circle {
  height: 0.9rem;
  width: 0.9rem;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.7);
}

.tag-name { font-size: 0.8rem; color: #4b5563; }

/* RATING */
.rating-section {
  padding: 0.75rem 0.9rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.06), rgba(56, 189, 248, 0.08));
  border: 1px dashed rgba(148, 163, 184, 0.7);
}

.rating-stars { display: flex; gap: 0.35rem; margin-top: 0.4rem; }

.star-button {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.15rem;
  transition: transform 0.1s ease;
}

.star-button:hover { transform: translateY(-1px) scale(1.03); }
.star-icon { font-size: 1.8rem; color: #d1d5db; }
.star-button.active .star-icon { color: #f59e0b; }

/* PIE DE FORMULARIO */
.form-footer {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-note { font-size: 0.8rem; color: var(--monster-muted); }

/* BOTONES */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.5rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: transform 0.1s ease, box-shadow 0.15s ease, filter 0.1s ease;
  white-space: nowrap;
}

.btn-primary {
  background: var(--primary-color);
  color: #ffffff;
  border-radius: 0.3rem;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

.btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.btn-icon { font-size: 1.1rem; }

/* DIÁLOGOS Y TRANSICIONES */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.55);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.dialog-enter-active, .dialog-leave-active { transition: opacity 0.3s ease; }
.dialog-enter-from, .dialog-leave-to { opacity: 0; }

.dialog-custom {
  width: 100%;
  max-width: 420px;
  background-color: #ffffff;
  border-radius: .3rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1.4rem;
  background: linear-gradient(135deg, #0f172a, #1f2937);
  color: #f9fafb;
}

.dialog-header--success { background: linear-gradient(135deg, #16a34a, #22c55e); }
.dialog-header--error { background: linear-gradient(135deg, #b91c1c, #ef4444); }

.dialog-header-icon { font-size: 1.6rem; }
.dialog-header-title { font-size: 1rem; font-weight: 600; }

.dialog-content { padding: 1.4rem 1.6rem 1.2rem 1.6rem; text-align: center; }
.dialog-text { margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #374151; }

.last-id {
  font-size: 2.4rem;
  font-weight: 800;
  color: #111827;
  letter-spacing: 0.08em;
  margin: 0.3rem 0 0.4rem 0;
}

.gracias-message {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.8rem;
  color: #111827;
}

.dialog-link { text-decoration: none; }

/* RESET LOCAL */
h1, h2, h3, p { margin: 0; padding: 0; }

/* RESPONSIVE */
@media (max-width: 768px) {
  .monster-ayuda-page { padding: 2rem 1rem; }
  .card { padding: 1.5rem 1.3rem; }
  .card-header { flex-direction: column; align-items: flex-start; }
  .main-image { align-self: center; }
  .form-grid { grid-template-columns: 1fr; }
  .form-footer { flex-direction: column-reverse; align-items: flex-start; }
}
</style>