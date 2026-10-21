// Servidor de producción: API de ofertas reales + ficheros estáticos de la PWA.
// Sin dependencias: solo módulos nativos de Node (>= 20).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import {
  airports, routes, cheapestRoundTrip, perDay, buses, rates, cityImage, ryanairUrl, addDays, today, flightMinutes,
} from './providers.js'
import { record, assess, series } from './history.js'

const PORT = Number(process.env.PORT ?? 3000)
const DIST = path.resolve(process.env.DIST_DIR ?? 'dist')
const WARM_ORIGINS = (process.env.WARM_ORIGINS ?? 'MAD').split(',').map((s) => s.trim()).filter(Boolean)

const round = (n) => Math.round(n * 100) / 100
const hhmm = (iso) => iso.slice(11, 16)
const weekday = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay()
const nightsBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

/**
 * Corrige duraciones ida/vuelta cuando la zona horaria de algún aeropuerto viene
 * desfasada (p. ej. Marruecos): si difieren >= 45 min se usa la media de ambas.
 */
function balance(a, b) {
  if (a == null || b == null || Math.abs(a - b) < 45) return [a, b]
  const avg = Math.round((a + b) / 2)
  return [avg, avg]
}

// --- Lógica de negocio --------------------------------------------------------

/** Convierte una tarifa ida/vuelta de Ryanair en un "chollo" con etiquetas reales. */
async function toDeal(o, fare, adults = 1) {
  const A = await airports()
  const d = fare.outbound.arrivalAirport.iataCode
  const price = round(fare.summary.price.value)
  const key = `rt:${o}-${d}`
  const { tags, oldPrice, points, since } = assess(key, price)
  record(key, price)

  const outDate = fare.outbound.departureDate.slice(0, 10)
  const backDate = fare.inbound.departureDate.slice(0, 10)
  const nights = fare.summary.tripDurationDays ?? nightsBetween(outDate, backDate)
  const prevRyanair = fare.summary.previousPrice?.value
  if (prevRyanair && prevRyanair > price && !tags.includes('bajada')) tags.push('bajada')
  if (price <= 30) tags.push('superchollo')
  if ([4, 5].includes(weekday(outDate)) && nights <= 3) tags.push('finde')
  tags.push('directo')

  const outLeg = legInfo(fare.outbound, A)
  const backLeg = legInfo(fare.inbound, A)
  ;[outLeg.duration, backLeg.duration] = balance(outLeg.duration, backLeg.duration)

  return {
    id: `deal-${o}-${d}`,
    type: 'deal',
    origin: { code: o, city: A[o]?.city ?? o },
    code: d,
    city: A[d]?.city ?? fare.outbound.arrivalAirport.city?.name,
    airport: A[d]?.name ?? fare.outbound.arrivalAirport.name,
    country: A[d]?.country ?? fare.outbound.arrivalAirport.countryName,
    image: `/api/image/${d}`,
    price,
    oldPrice: prevRyanair && prevRyanair > price ? round(prevRyanair) : oldPrice,
    outDate,
    backDate,
    nights,
    out: outLeg,
    back: backLeg,
    duration: outLeg.duration,
    airline: 'Ryanair',
    stops: 0,
    tags,
    history: { points, since },
    bookingUrl: ryanairUrl({ origin: o, dest: d, out: outDate, back: backDate, adults }),
    checkedAt: Date.now(),
  }
}

function legInfo(leg, A) {
  const from = leg.departureAirport.iataCode
  const to = leg.arrivalAirport.iataCode
  return {
    flight: leg.flightNumber,
    from,
    to,
    date: leg.departureDate.slice(0, 10),
    depart: hhmm(leg.departureDate),
    arrive: hhmm(leg.arrivalDate),
    duration: flightMinutes(leg.departureDate, A[from]?.tz, leg.arrivalDate, A[to]?.tz),
    price: round(leg.price.value),
  }
}

/** Ida y vuelta más barata a cada destino desde un origen. */
async function bestPerDestination(o, window) {
  const dests = await routes(o)
  const settled = await Promise.allSettled(dests.map((d) => cheapestRoundTrip(o, d, window)))
  const fares = settled.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value)
  const deals = await Promise.all(fares.map((f) => toDeal(o, f)))
  return deals.sort((a, b) => a.price - b.price)
}

/** Chollos del día: próximos 3 meses, estancias de 2 a 7 noches. */
async function deals(o) {
  lastRequested.set(o, Date.now())
  return bestPerDestination(o, { from: addDays(today(), 2), to: addDays(today(), 90), minNights: 2, maxNights: 7 })
}

/** Ventana de fechas de ida según el modo de búsqueda. */
function outWindow({ mode, out, month }) {
  const min = addDays(today(), 1)
  const max = (a, b) => (a > b ? a : b)
  if (mode === 'exact') return { from: max(addDays(out, -3), min), to: max(addDays(out, 3), min) }
  if (mode === 'month') {
    const [y, m] = month.split('-').map(Number)
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) // último día del mes
    return { from: max(`${month}-01`, min), to: end }
  }
  return { from: min, to: addDays(today(), 75) }
}

/** Opciones de ida y vuelta (precio real de cada tramo) para una ruta concreta. */
async function trips({ origin: o, dest: d, mode, out, back, month, nights, adults }) {
  const A = await airports()
  const n = mode === 'exact' ? Math.max(1, nightsBetween(out, back)) : nights
  const win = outWindow({ mode, out, month })
  if (win.from > win.to) return { flights: [], calendar: [] }
  const [outs, ins] = await Promise.all([perDay(o, d, win.from, win.to), perDay(d, o, addDays(win.from, n), addDays(win.to, n))])
  const inByDay = Object.fromEntries(ins.map((f) => [f.day, f]))

  const flights = outs
    .map((f) => {
      const r = inByDay[addDays(f.day, n)]
      if (!r) return null
      const price = round(f.price + r.price)
      const [durOut, durBack] = balance(flightMinutes(f.dep, A[o]?.tz, f.arr, A[d]?.tz), flightMinutes(r.dep, A[d]?.tz, r.arr, A[o]?.tz))
      return {
        id: `fl-${o}-${d}-${f.day}-${n}`,
        type: 'flight',
        airline: 'Ryanair',
        from: o,
        to: d,
        origin: { code: o, city: A[o]?.city },
        code: d,
        city: A[d]?.city,
        country: A[d]?.country,
        image: `/api/image/${d}`,
        outDate: f.day,
        backDate: r.day,
        nights: n,
        depart: hhmm(f.dep),
        arrive: hhmm(f.arr),
        duration: durOut,
        back: { depart: hhmm(r.dep), arrive: hhmm(r.arr), price: round(r.price), duration: durBack },
        outPrice: round(f.price),
        price,
        stops: 0,
        exact: mode === 'exact' && f.day === out,
        tags: ['directo'],
        bookingUrl: ryanairUrl({ origin: o, dest: d, out: f.day, back: r.day, adults }),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.price - b.price)

  if (flights[0]) record(`rt:${o}-${d}`, flights[0].price)
  return {
    origin: A[o],
    dest: A[d],
    nights: n,
    flights: flights.slice(0, mode === 'exact' ? 7 : 20),
    calendar: outs.map((f) => ({ day: f.day, price: f.price })),
  }
}

/** Precio mínimo de ida y vuelta para cada uno de los próximos 6 meses. */
async function months({ origin: o, dest: d, nights }) {
  const now = new Date()
  const list = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
    return m.toISOString().slice(0, 7)
  })
  return Promise.all(
    list.map(async (month) => {
      try {
        const { flights } = await trips({ origin: o, dest: d, mode: 'month', month, nights, adults: 1 })
        return { month, price: flights[0]?.price ?? null }
      } catch {
        return { month, price: null }
      }
    })
  )
}

/** "Cualquier destino" con las fechas elegidas en el buscador. */
async function anywhere({ origin: o, mode, out, back, month, nights }) {
  if (mode === 'exact') {
    const n = Math.max(1, nightsBetween(out, back))
    return bestPerDestination(o, { from: out, to: out, minNights: n, maxNights: n })
  }
  const win = outWindow({ mode, out, month })
  return bestPerDestination(o, { from: win.from, to: win.to, minNights: Math.max(1, nights - 1), maxNights: nights + 1 })
}

/** Calendario de precios por día + histórico registrado de una ruta (vista de detalle). */
async function calendar({ origin: o, dest: d, days = 90 }) {
  const from = addDays(today(), 1)
  const list = await perDay(o, d, from, addDays(from, days - 1))
  return { calendar: list.map((f) => ({ day: f.day, price: f.price })), history: series(`rt:${o}-${d}`) }
}

/** Precio actual de varias rutas vigiladas por alertas. */
async function routePrices(list) {
  const win = { from: addDays(today(), 2), to: addDays(today(), 90), minNights: 2, maxNights: 7 }
  return Promise.all(
    list.map(async ([o, d]) => {
      try {
        const fare = await cheapestRoundTrip(o, d, win)
        return fare ? await toDeal(o, fare) : { id: `deal-${o}-${d}`, origin: { code: o }, code: d, price: null }
      } catch {
        return { id: `deal-${o}-${d}`, origin: { code: o }, code: d, price: null, error: true }
      }
    })
  )
}

// --- Precalentado periódico (también va construyendo el histórico) ----------

const lastRequested = new Map()
async function warm() {
  const recent = [...lastRequested].filter(([, t]) => Date.now() - t < 24 * 3600_000).map(([o]) => o)
  for (const o of new Set([...WARM_ORIGINS, ...recent])) {
    try {
      await bestPerDestination(o, { from: addDays(today(), 2), to: addDays(today(), 90), minNights: 2, maxNights: 7 })
    } catch (e) {
      console.warn(`[warm] ${o}: ${e.message}`)
    }
  }
}
setTimeout(warm, 3000).unref()
setInterval(warm, 3 * 3600_000).unref()

// --- Router de la API -----------------------------------------------------------

const IATA = /^[A-Z]{3}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-\d{2}$/

function params(url) {
  const q = Object.fromEntries(url.searchParams)
  const p = {
    origin: (q.origin ?? 'MAD').toUpperCase(),
    dest: q.dest?.toUpperCase(),
    mode: ['exact', 'month', 'any'].includes(q.mode) ? q.mode : 'any',
    out: q.out,
    back: q.back,
    month: q.month,
    nights: Math.min(21, Math.max(1, Number(q.nights) || 3)),
    adults: Math.min(9, Math.max(1, Number(q.adults) || 1)),
  }
  if (!IATA.test(p.origin) || (p.dest && !IATA.test(p.dest))) throw badRequest('Código de aeropuerto no válido')
  if (p.mode === 'exact' && !(DATE.test(p.out ?? '') && DATE.test(p.back ?? '') && p.back > p.out)) throw badRequest('Fechas no válidas')
  if (p.mode === 'month' && !MONTH.test(p.month ?? '')) throw badRequest('Mes no válido')
  return p
}

const badRequest = (msg) => Object.assign(new Error(msg), { status: 400 })

const API = {
  '/api/status': async () => ({ ok: true, sources: ['Ryanair', 'FlixBus', 'BCE (Frankfurter)', 'Wikipedia'], warm: WARM_ORIGINS }),
  '/api/rates': () => rates(),
  '/api/airports': async (url) => {
    const A = await airports()
    const country = url.searchParams.get('country')
    return Object.values(A)
      .filter((a) => !country || a.countryCode === country)
      .sort((a, b) => a.city.localeCompare(b.city, 'es'))
  },
  '/api/routes': async (url) => {
    const { origin } = params(url)
    const [A, list] = await Promise.all([airports(), routes(origin)])
    return list
      .map((c) => A[c] ?? { code: c, city: c, name: c })
      .sort((a, b) => a.city.localeCompare(b.city, 'es'))
  },
  '/api/deals': async (url) => deals(params(url).origin),
  '/api/trips': async (url) => {
    const p = params(url)
    if (!p.dest) throw badRequest('Falta el destino')
    return trips(p)
  },
  '/api/months': async (url) => {
    const p = params(url)
    if (!p.dest) throw badRequest('Falta el destino')
    return months(p)
  },
  '/api/anywhere': async (url) => anywhere(params(url)),
  '/api/calendar': async (url) => {
    const p = params(url)
    if (!p.dest) throw badRequest('Falta el destino')
    return calendar({ ...p, days: Math.min(180, Number(url.searchParams.get('days')) || 90) })
  },
  '/api/buses': async (url) => {
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const date = url.searchParams.get('date')
    if (!from || !to || !DATE.test(date ?? '')) throw badRequest('Parámetros no válidos')
    return buses(from.slice(0, 60), to.slice(0, 60), date, params(url).adults)
  },
  '/api/prices': async (url) => {
    const list = (url.searchParams.get('routes') ?? '')
      .split(',')
      .map((r) => r.toUpperCase().split('-'))
      .filter(([o, d]) => IATA.test(o ?? '') && IATA.test(d ?? ''))
      .slice(0, 20)
    return routePrices(list)
  },
}

async function handleImage(res, code) {
  if (!IATA.test(code)) return send(res, 404, 'text/plain', 'No encontrado')
  const A = await airports().catch(() => ({}))
  const src = await cityImage(code, A[code]?.city ?? code, A[code]?.country).catch(() => null)
  if (!src) return send(res, 404, 'text/plain', 'Sin imagen')
  res.writeHead(302, { Location: src, 'Cache-Control': 'public, max-age=21600' })
  res.end()
}

// --- Ficheros estáticos -----------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg'])

function send(res, status, type, body, req, extra = {}) {
  const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', ...extra }
  if (req && body.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    body = zlib.gzipSync(body)
    headers['Content-Encoding'] = 'gzip'
    headers.Vary = 'Accept-Encoding'
  }
  res.writeHead(status, headers)
  res.end(body)
}

function serveStatic(req, res, pathname) {
  let file = path.join(DIST, decodeURIComponent(pathname))
  if (!file.startsWith(DIST)) return send(res, 403, 'text/plain', 'Prohibido')
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html') // SPA
  if (!fs.existsSync(file)) return send(res, 404, 'text/plain', 'Ejecuta "npm run build" primero')
  const ext = path.extname(file)
  const cache = pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
  const body = fs.readFileSync(file)
  send(res, 200, MIME[ext] ?? 'application/octet-stream', body, COMPRESSIBLE.has(ext) ? req : null, { 'Cache-Control': cache })
}

// --- Servidor -----------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'Método no permitido')
    if (url.pathname.startsWith('/api/image/')) return await handleImage(res, url.pathname.slice(11))
    const handler = API[url.pathname]
    if (handler) {
      const data = await handler(url)
      return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(data), req, { 'Cache-Control': 'no-store' })
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, 'application/json', JSON.stringify({ error: 'No encontrado' }))
    serveStatic(req, res, url.pathname)
  } catch (err) {
    const status = err.status ?? 502
    if (status >= 500) console.error(`[${url.pathname}]`, err.message)
    send(res, status, 'application/json; charset=utf-8', JSON.stringify({ error: status === 400 ? err.message : 'Fuente de datos no disponible ahora mismo' }))
  }
})

server.listen(PORT, () => console.log(`Chollo escuchando en http://localhost:${PORT}`))
