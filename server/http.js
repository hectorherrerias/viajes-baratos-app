// Cliente HTTP con caché en memoria, límite de concurrencia y respaldo "stale"
// (si la fuente falla, se devuelve el último dato bueno conocido).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36 CholloApp/1.0'
const MAX_CONCURRENT = 6

let active = 0
const queue = []

async function limited(fn) {
  if (active >= MAX_CONCURRENT) await new Promise((r) => queue.push(r))
  active++
  try {
    return await fn()
  } finally {
    active--
    queue.shift()?.()
  }
}

export async function getJSON(url, { timeout = 12000, userAgent = UA } = {}) {
  return limited(async () => {
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeout),
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} · ${new URL(url).host}`)
    return res.json()
  })
}

const store = new Map() // key -> { t, data, pending }

/** Ejecuta `fn` una sola vez por `key` durante `ttl` ms. */
export async function cached(key, ttl, fn) {
  const hit = store.get(key)
  if (hit?.data !== undefined && Date.now() - hit.t < ttl) return hit.data
  if (hit?.pending) return hit.pending

  const pending = fn()
    .then((data) => {
      store.set(key, { t: Date.now(), data })
      return data
    })
    .catch((err) => {
      if (hit?.data !== undefined) {
        store.set(key, { ...hit, pending: undefined })
        return hit.data // dato antiguo mejor que nada
      }
      store.delete(key)
      throw err
    })
  store.set(key, { ...hit, pending })
  return pending
}

/** Fecha (ms) en la que se obtuvo un dato cacheado. */
export const cachedAt = (key) => store.get(key)?.t ?? null

// Limpieza periódica de entradas antiguas (>24 h)
setInterval(() => {
  const limit = Date.now() - 24 * 3600_000
  for (const [k, v] of store) if (!v.pending && v.t < limit) store.delete(k)
}, 3600_000).unref()
