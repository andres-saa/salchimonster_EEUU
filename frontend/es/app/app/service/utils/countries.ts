import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

// 1. ELIMINAMOS TODAS las importaciones de 'i18n-iso-countries'
// Adiós a los errores de compilación y imports dinámicos.

export type CountryOption = {
  code: string        // "CO"
  name: string        // "Colombia"
  dialCode: string    // "+57"
  flag: string        // URL bandera
  label: string       // Texto para el select
  dialDigits?: string // "57"
}

export function buildCountryOptions(locale: 'es'|'en' = 'es'): CountryOption[] {
  // 2. Instanciamos el traductor nativo de regiones
  // Esto usa la base de datos interna de Node/Navegador
  const regionNames = new Intl.DisplayNames([locale], { type: 'region' })

  const codes = getCountries()

  const opts: CountryOption[] = codes.map((code) => {
    // 3. Obtenemos el nombre traducido nativamente
    // Si falla por alguna razón rara, usamos el código como fallback
    let name = code
    try {
      name = regionNames.of(code) || code
    } catch (e) {
      // Manejo de error silencioso por si el código es exótico
      name = code
    }

    const dial = '+' + getCountryCallingCode(code)
    const flag = `https://flagcdn.com/w20/${code.toLowerCase()}.png`

    return {
      code,
      name,
      dialCode: dial,
      flag,
      label: `${dial}  ${name}`, // Ajusté el label para que se vea mejor
      dialDigits: dial.replace(/\D+/g, ''),
    }
  })

  // Ordenar alfabéticamente respetando acentos (Á antes que B)
  opts.sort((a, b) => a.name.localeCompare(b.name, locale))

  return opts
}