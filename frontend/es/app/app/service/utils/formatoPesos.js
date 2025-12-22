// Función para formatear un número como Euros
// (Mantiene el nombre antiguo para evitar errores de importación)
function formatoPesosColombianos(numero) {
  // Usamos 'es-ES' para que el formato coincida con el estándar del Euro (1.000.000 €)
  return new Intl.NumberFormat('es-co', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero)
}

// Ejemplo de uso
const numero = 1000000
const numeroFormateado = formatoPesosColombianos(numero)

// console.log(numeroFormateado); 
// Resultado: "1.000.000 €"

export { formatoPesosColombianos }