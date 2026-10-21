// Utilidades de formato y conversión de moneda

export const CURRENCIES = {
  EUR: { symbol: '€', rate: 1, locale: 'es-ES' },
  USD: { symbol: '$', rate: 1.08, locale: 'en-US' },
  GBP: { symbol: '£', rate: 0.85, locale: 'en-GB' },
}

/** Convierte un precio base en EUR a la moneda elegida y lo formatea. */
export function formatPrice(eur, currency = 'EUR', { decimals = 0 } = {}) {
  const c = CURRENCIES[currency] ?? CURRENCIES.EUR
  return new Intl.NumberFormat(c.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(eur * c.rate)
}

export function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function pctOff(price, old) {
  return Math.round((1 - price / old) * 100)
}

export const cx = (...c) => c.filter(Boolean).join(' ')
