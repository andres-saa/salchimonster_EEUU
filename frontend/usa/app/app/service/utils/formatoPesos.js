// (Mantiene el nombre antiguo para evitar errores de importación)
function formatoPesosColombianos(numero) {
  // Formato Euro - España: 1.000.000 €
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero)
}

// Ejemplo
const numero = 1000000
const numeroFormateado = formatoPesosColombianos(numero)
// "1.000.000 €"

export { formatoPesosColombianos }
