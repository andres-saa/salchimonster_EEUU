// ~/utils/countries.ts
import { getCountries, getCountryCallingCode } from 'libphonenumber-js'
import isoCountries from 'i18n-iso-countries'

// ✅ Importación ESTÁTICA (Vite/Rollup lo soporta bien)
import en from 'i18n-iso-countries/langs/en.json'
import es from 'i18n-iso-countries/langs/es.json'

export type SupportedLocale = 'es' | 'en'

export type CountryOption = {
  code: string        // "CO"
  name: string        // "Colombia"
  dialCode: string    // "+57"
  flag: string        // URL bandera
  label: string       // Texto para el select
  dialDigits?: string // "57"
}

// ---- Registro de locales SOLO una vez ----
let localesRegistered = false
function ensureLocalesRegistered() {
  if (localesRegistered) return
  isoCountries.registerLocale(en as any)
  isoCountries.registerLocale(es as any)
  localesRegistered = true
}

// ---- Normaliza cualquier locale raro a 'es' o 'en' ----
// Ej: "es-CO" -> "es", "en-US" -> "en", "pt-BR" -> "es", "br" -> "es"
export function normalizeLocale(input?: string): SupportedLocale {
  const raw = (input || '').toLowerCase().trim()

  if (raw.startsWith('en')) return 'en'
  if (raw.startsWith('es')) return 'es'

  // Cualquier otra cosa (pt, br, fr, etc) => fallback
  return 'es'
}

// ---- Cache para no recalcular la lista cada render ----
const cache: Record<SupportedLocale, CountryOption[] | null> = {
  es: null,
  en: null,
}

export function buildCountryOptions(localeLike: string = 'es'): CountryOption[] {
  ensureLocalesRegistered()

  const locale = normalizeLocale(localeLike)

  // ✅ Devuelve cache si ya existe
  const cached = cache[locale]
  if (cached) return cached

  const codes = getCountries()

  const opts: CountryOption[] = codes.map((code) => {
    // ✅ OJO: aquí usamos locale ya normalizado ('es'|'en')
    const name = isoCountries.getName(code, locale) || code
    const dial = '+' + getCountryCallingCode(code)
    const flag = `https://flagcdn.com/w20/${code.toLowerCase()}.png`

    return {
      code,
      name,
      dialCode: dial,
      flag,
      label: `${dial}  ${name}`,
      dialDigits: dial.replace(/\D+/g, ''),
    }
  })

  opts.sort((a, b) => a.name.localeCompare(b.name, locale))

  cache[locale] = opts
  return opts
}
