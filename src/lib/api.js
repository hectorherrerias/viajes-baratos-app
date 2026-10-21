// Cliente de la API propia (/api/*) con caché en memoria y hook de React.
import { useCallback, useEffect, useState } from 'react'

const TTL = 10 * 60_000
const cache = new Map() // url -> { t, data }
const inflight = new Map()

/** Construye una URL de la API ignorando parámetros vacíos. */
export function apiUrl(path, params = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') q.set(k, v)
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export async function fetchApi(url, { force = false } = {}) {
  const hit = cache.get(url)
  if (!force && hit && Date.now() - hit.t < TTL) return hit.data
  if (inflight.has(url)) return inflight.get(url)
  const p = fetch(url)
    .then(async (res) => {
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      cache.set(url, { t: Date.now(), data: body })
      return body
    })
    .finally(() => inflight.delete(url))
  inflight.set(url, p)
  return p
}

/** Momento (ms) en el que se obtuvo una respuesta cacheada. */
export const fetchedAt = (url) => cache.get(url)?.t ?? null

/**
 * Hook de datos: devuelve { data, error, loading, reload }.
 * Si `url` es null no hace nada (útil para peticiones condicionales).
 */
export function useApi(url) {
  const [state, setState] = useState(() => ({ data: url ? cache.get(url)?.data : undefined, error: null, loading: Boolean(url) }))
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!url) {
      setState({ data: undefined, error: null, loading: false })
      return
    }
    let alive = true
    const hit = cache.get(url)
    setState({ data: hit?.data, error: null, loading: !hit || nonce > 0 })
    fetchApi(url, { force: nonce > 0 })
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState((s) => ({ data: s.data, error, loading: false })))
    return () => {
      alive = false
    }
  }, [url, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
