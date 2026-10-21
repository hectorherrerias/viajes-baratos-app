// Utilidades de formato (precios, fechas, duraciones)

export const CURRENCIES = {
  EUR: { symbol: '€', locale: 'es-ES' },
  USD: { symbol: '$', locale: 'en-US' },
  GBP: { symbol: '£', locale: 'en-GB' },
}

/** Formatea un precio en EUR convertido a la moneda elegida con el tipo de cambio dado. */
export function formatPrice(eur, currency = 'EUR', { rate = 1, decimals } = {}) {
  if (eur == null || Number.isNaN(eur)) return '—'
  const c = CURRENCIES[currency] ?? CURRENCIES.EUR
  const v = eur * rate
  const d = decimals ?? (v < 100 && v % 1 !== 0 ? 2 : 0)
  return new Intl.NumberFormat(c.locale, { style: 'currency', currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
}

export function formatDuration(min) {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

const dayFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekdayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' })

/** '2026-11-14' -> '14 nov' */
export const fmtDay = (iso) => (iso ? dayFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)).replace('.', '') : '')
/** '2026-11-14' -> 'sáb, 14 nov' */
export const fmtWeekday = (iso) => (iso ? weekdayFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)).replace(/\./g, '') : '')
/** '2026-11' -> 'nov' */
export const fmtMonth = (ym) => monthFmt.format(new Date(`${ym}-01T00:00:00Z`)).replace('.', '')

/** Hace cuánto (texto corto) */
export function timeAgo(ms) {
  if (!ms) return ''
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 60) return 'ahora mismo'
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`
  return `hace ${Math.round(s / 86400)} d`
}

export const isoDate = (d) => d.toISOString().slice(0, 10)
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return isoDate(d)
}
export const todayIso = () => isoDate(new Date())

export function pctOff(price, old) {
  return old ? Math.round((1 - price / old) * 100) : 0
}

export const cx = (...c) => c.filter(Boolean).join(' ')
