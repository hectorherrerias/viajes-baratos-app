// Histórico real de precios registrado por la propia app.
// Cada vez que consultamos una ruta guardamos el precio mínimo del día, así con el
// tiempo podemos detectar mínimos, bajadas y posibles "error fares" con datos reales.
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR ?? path.resolve('data')
const FILE = path.join(DATA_DIR, 'history.json')
const KEEP_DAYS = 365

let db = {}
try {
  db = JSON.parse(fs.readFileSync(FILE, 'utf8'))
} catch {
  db = {}
}

let dirty = false
function persist() {
  if (!dirty) return
  dirty = false
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(db))
    fs.renameSync(`${FILE}.tmp`, FILE)
  } catch (err) {
    console.error(`[history] No se pudo guardar ${FILE}: ${err.message}`)
  }
}
setInterval(persist, 60_000).unref()
process.on('SIGTERM', () => {
  persist()
  process.exit(0)
})
process.on('SIGINT', () => {
  persist()
  process.exit(0)
})

const todayKey = () => new Date().toISOString().slice(0, 10)

/** Registra el precio de hoy (se queda con el mínimo del día). */
export function record(key, price) {
  if (!(price > 0)) return
  const day = todayKey()
  const series = (db[key] ??= {})
  if (series[day] == null || price < series[day]) {
    series[day] = Math.round(price * 100) / 100
    dirty = true
  }
  const days = Object.keys(series)
  if (days.length > KEEP_DAYS) for (const d of days.sort().slice(0, days.length - KEEP_DAYS)) delete series[d]
}

/** Serie ordenada [{day, price}] de una clave. */
export function series(key) {
  return Object.entries(db[key] ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, price]) => ({ day, price }))
}

/**
 * Evalúa un precio actual frente al histórico registrado (días anteriores a hoy).
 * Devuelve etiquetas basadas en datos reales y el precio anterior si ha bajado.
 */
export function assess(key, price) {
  const past = series(key).filter((p) => p.day < todayKey())
  const tags = []
  let oldPrice = null
  const prev = past.at(-1)?.price
  if (prev && price <= prev * 0.9) {
    tags.push('bajada')
    oldPrice = prev
  }
  const sorted = past.map((p) => p.price).sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  if ((prev && price <= prev * 0.5) || (sorted.length >= 5 && price <= median * 0.35)) tags.push('error')
  if (sorted.length >= 3 && price <= sorted[0]) tags.push('minimo')
  if (!oldPrice && median && price < median * 0.85) oldPrice = median
  return { tags, oldPrice, points: past.length, since: past[0]?.day ?? null }
}
