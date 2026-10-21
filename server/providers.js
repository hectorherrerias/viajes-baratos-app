// Fuentes de datos reales:
//  - Ryanair (API pública de tarifas "farfnd"): rutas, ida y vuelta más barata y precio por día
//  - FlixBus (API pública de búsqueda): autobuses y trenes FlixTrain
//  - Frankfurter (BCE): tipos de cambio
//  - Wikipedia: foto de cada ciudad
import { cached, getJSON } from './http.js'

const RYANAIR = 'https://services-api.ryanair.com/farfnd/v4'
const RYANAIR_WWW = 'https://www.ryanair.com/api'
const FLIXBUS = 'https://global.api.flixbus.com'

const H = 3600_000

// --- Ryanair -----------------------------------------------------------------

/** Aeropuertos activos de Ryanair indexados por código IATA. */
export const airports = () =>
  cached('airports', 24 * H, async () => {
    const list = await getJSON(`${RYANAIR_WWW}/views/locate/5/airports/es/active`)
    const map = {}
    for (const a of list) {
      map[a.code] = {
        code: a.code,
        name: a.name,
        city: a.city?.name ?? a.name,
        country: a.country?.name,
        countryCode: a.country?.code,
        tz: a.timeZone,
        base: a.base,
      }
    }
    return map
  })

/** Destinos directos desde un aeropuerto. */
export const routes = (origin) =>
  cached(`routes:${origin}`, 12 * H, async () => {
    const list = await getJSON(`${RYANAIR_WWW}/views/locate/searchWidget/routes/es/airport/${origin}`)
    return list.filter((r) => !r.connectingAirport).map((r) => r.arrivalAirport.code)
  })

/** Ida y vuelta más barata de una ruta en una ventana de fechas. */
export const cheapestRoundTrip = (o, d, { from, to, minNights, maxNights }) =>
  cached(`rt:${o}:${d}:${from}:${to}:${minNights}:${maxNights}`, 1 * H, async () => {
    const q = new URLSearchParams({
      departureAirportIataCode: o,
      arrivalAirportIataCode: d,
      outboundDepartureDateFrom: from,
      outboundDepartureDateTo: to,
      inboundDepartureDateFrom: from,
      inboundDepartureDateTo: addDays(to, maxNights),
      durationFrom: minNights,
      durationTo: maxNights,
      currency: 'EUR',
    })
    const res = await getJSON(`${RYANAIR}/roundTripFares?${q}`)
    return res.fares?.[0] ?? null
  })

/** Precio más barato de cada día (solo ida) en un rango de fechas. */
export const perDay = (o, d, from, to) =>
  cached(`pd:${o}:${d}:${from}:${to}`, 1 * H, async () => {
    const q = new URLSearchParams({ outboundDateFrom: from, outboundDateTo: to, currency: 'EUR' })
    const res = await getJSON(`${RYANAIR_WWW}/farfnd/v4/oneWayFares/${o}/${d}/cheapestPerDay?${q}`)
    return (res.outbound?.fares ?? [])
      .filter((f) => f.price && !f.soldOut && !f.unavailable)
      .map((f) => ({ day: f.day, dep: f.departureDate, arr: f.arrivalDate, price: f.price.value }))
  })

export function ryanairUrl({ origin, dest, out, back, adults = 1 }) {
  const q = new URLSearchParams({
    adults, teens: 0, children: 0, infants: 0,
    dateOut: out, dateIn: back ?? '', isConnectedFlight: false, isReturn: Boolean(back), discount: 0,
    promoCode: '', originIata: origin, destinationIata: dest,
    tpAdults: adults, tpTeens: 0, tpChildren: 0, tpInfants: 0, tpStartDate: out, tpEndDate: back ?? '',
    tpDiscount: 0, tpPromoCode: '', tpOriginIata: origin, tpDestinationIata: dest,
  })
  return `https://www.ryanair.com/es/es/trip/flights/select?${q}`
}

// --- FlixBus -----------------------------------------------------------------

const flixCity = (name) =>
  cached(`flixcity:${name}`, 7 * 24 * H, async () => {
    const q = new URLSearchParams({ q: name, lang: 'es', country: 'es', flixbus_cities_only: 'false' })
    const list = await getJSON(`${FLIXBUS}/search/autocomplete/cities?${q}`)
    return list?.[0] ? { id: list[0].id, name: list[0].name } : null
  })

/** Autobuses/trenes de FlixBus entre dos ciudades en una fecha (YYYY-MM-DD). */
export async function buses(fromName, toName, date, adults = 1) {
  const [from, to] = await Promise.all([flixCity(fromName), flixCity(toName)])
  if (!from || !to || from.id === to.id) return []
  const [y, m, d] = date.split('-')
  const ride = `${d}.${m}.${y}`
  return cached(`flix:${from.id}:${to.id}:${date}:${adults}`, 1 * H, async () => {
    const q = new URLSearchParams({
      from_city_id: from.id, to_city_id: to.id, departure_date: ride,
      products: JSON.stringify({ adult: adults }), currency: 'EUR', locale: 'es',
      search_by: 'cities', include_after_midnight_rides: '1',
    })
    const res = await getJSON(`${FLIXBUS}/search/service/v4/search?${q}`)
    const results = Object.values(res.trips?.[0]?.results ?? {})
    const link = `https://shop.flixbus.es/search?${new URLSearchParams({ departureCity: from.id, arrivalCity: to.id, rideDate: ride, adult: adults, _locale: 'es' })}`
    return results
      .filter((r) => r.status === 'available' && r.price?.total)
      .map((r, i) => ({
        id: `bus-${from.id}-${to.id}-${date}-${i}`,
        type: 'transport',
        kind: (r.legs ?? []).some((l) => l.means_of_transport === 'train') ? 'train' : 'bus',
        operator: r.provider === 'flixbus' ? 'FlixBus' : r.provider,
        from: from.name,
        to: to.name,
        date,
        depart: r.departure.date.slice(11, 16),
        arrive: r.arrival.date.slice(11, 16),
        duration: (r.duration?.hours ?? 0) * 60 + (r.duration?.minutes ?? 0),
        transfers: r.transfer_type === 'Directo' ? 0 : (r.legs?.length ?? 2) - 1,
        price: r.price.total / adults,
        seats: r.available?.seats ?? null,
        bookingUrl: link,
      }))
      .sort((a, b) => a.price - b.price)
  })
}

// --- Tipos de cambio ---------------------------------------------------------

export const rates = () =>
  cached('rates', 12 * H, async () => {
    const res = await getJSON('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP')
    return { EUR: 1, ...res.rates, date: res.date }
  })

// --- Fotos de ciudades (Wikipedia) -------------------------------------------

// Wikimedia exige un User-Agent identificable con forma de contacto
const WIKI_UA = 'CholloApp/2.0 (https://github.com/hectorherrerias/viajes-baratos-app)'

// Nombres ambiguos en Wikipedia (Palma ≠ La Palma, Shannon es el aeropuerto de Limerick...)
const WIKI_ALIASES = { PMI: 'Catedral de Santa María de Palma de Mallorca', SNN: 'Limerick', NRN: 'Weeze', CRL: 'Charleroi', BVA: 'Beauvais' }

const CURATED = {
  LIS: '1555881400-74d7acaacd8b', FCO: '1552832230-c0197dd311b5', CIA: '1552832230-c0197dd311b5',
  STN: '1513635269975-59663e0ac1ad', LGW: '1513635269975-59663e0ac1ad', LTN: '1513635269975-59663e0ac1ad',
  BVA: '1502602898657-3e91760cbb34', CDG: '1502602898657-3e91760cbb34', AMS: '1534351590666-13e3e96b5017',
  EIN: '1534351590666-13e3e96b5017', PRG: '1541849546-216549ae216d', BER: '1560969184-10fe8719e047',
  ATH: '1555993539-1732b0258235', BUD: '1549877452-9c387954fbc2', RAK: '1597212618440-806262de4f6b',
}

export const cityImage = (code, name, country) =>
  cached(`img:${code}`, 7 * 24 * H, async () => {
    const city = WIKI_ALIASES[code] ?? name
    if (CURATED[code]) return `https://images.unsplash.com/photo-${CURATED[code]}?auto=format&fit=crop&w=800&q=70`
    for (const lang of ['es', 'en']) {
      try {
        const res = await getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`, { userAgent: WIKI_UA })
        const src = res.thumbnail?.source
        // Wikimedia solo sirve miniaturas en anchos estándar (330, 500, 960...)
        if (src && res.type !== 'disambiguation' && !src.includes('.svg')) return src.replace(/\/\d+px-/, '/960px-')
      } catch {
        /* probamos el siguiente idioma */
      }
    }
    // Respaldo: búsqueda "ciudad país" (evita páginas de desambiguación como "Palma")
    try {
      const q = new URLSearchParams({
        action: 'query', generator: 'search', gsrsearch: `${city} ${country ?? ''}`.trim(), gsrlimit: 1,
        prop: 'pageimages', piprop: 'thumbnail', pithumbsize: 960, format: 'json',
      })
      const res = await getJSON(`https://es.wikipedia.org/w/api.php?${q}`, { userAgent: WIKI_UA })
      const page = Object.values(res.query?.pages ?? {})[0]
      if (page?.thumbnail?.source && !page.thumbnail.source.includes('.svg')) return page.thumbnail.source
    } catch {
      /* sin imagen: el cliente muestra un degradado */
    }
    return null
  })

// --- Utilidades de fechas ------------------------------------------------------

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const today = () => new Date().toISOString().slice(0, 10)

/** Minutos de diferencia entre la hora local de una zona y UTC en un instante dado. */
function tzOffset(tz, localIso) {
  const guess = new Date(`${localIso}Z`)
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(guess)
      .map((x) => [x.type, x.value])
  )
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess.getTime()) / 60000
}

/** Duración real de un vuelo a partir de horas locales y zonas horarias. */
export function flightMinutes(dep, depTz, arr, arrTz) {
  const a = Date.parse(`${dep}Z`) - (depTz ? tzOffset(depTz, dep) : 0) * 60000
  const b = Date.parse(`${arr}Z`) - (arrTz ? tzOffset(arrTz, arr) : 0) * 60000
  return Math.round((b - a) / 60000)
}
