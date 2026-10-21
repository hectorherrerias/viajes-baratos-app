// Datos simulados (mock) de la app. Todos los precios están en EUR y se
// convierten en la vista según la moneda elegida. Los generadores usan un
// PRNG con semilla para que los resultados sean estables entre renders.

const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`

/** PRNG determinista (mulberry32) a partir de un texto semilla. */
export function seeded(seedText) {
  let h = 1779033703 ^ seedText.length
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const ORIGINS = [
  { code: 'MAD', city: 'Madrid', factor: 1 },
  { code: 'BCN', city: 'Barcelona', factor: 0.95 },
  { code: 'VLC', city: 'Valencia', factor: 1.05 },
  { code: 'AGP', city: 'Málaga', factor: 1.02 },
  { code: 'SVQ', city: 'Sevilla', factor: 1.1 },
  { code: 'BIO', city: 'Bilbao', factor: 1.12 },
]

export const DESTINATIONS = [
  { code: 'LIS', city: 'Lisboa', country: 'Portugal', image: img('1555881400-74d7acaacd8b'), base: 24 },
  { code: 'CDG', city: 'París', country: 'Francia', image: img('1502602898657-3e91760cbb34'), base: 39 },
  { code: 'FCO', city: 'Roma', country: 'Italia', image: img('1552832230-c0197dd311b5'), base: 29 },
  { code: 'STN', city: 'Londres', country: 'Reino Unido', image: img('1513635269975-59663e0ac1ad'), base: 34 },
  { code: 'AMS', city: 'Ámsterdam', country: 'Países Bajos', image: img('1534351590666-13e3e96b5017'), base: 49 },
  { code: 'PRG', city: 'Praga', country: 'Chequia', image: img('1541849546-216549ae216d'), base: 37 },
  { code: 'BER', city: 'Berlín', country: 'Alemania', image: img('1560969184-10fe8719e047'), base: 33 },
  { code: 'ATH', city: 'Atenas', country: 'Grecia', image: img('1555993539-1732b0258235'), base: 45 },
  { code: 'IST', city: 'Estambul', country: 'Turquía', image: img('1524231757912-21f4fe3a7200'), base: 58 },
  { code: 'BUD', city: 'Budapest', country: 'Hungría', image: img('1549877452-9c387954fbc2'), base: 31 },
  { code: 'RAK', city: 'Marrakech', country: 'Marruecos', image: img('1597212618440-806262de4f6b'), base: 27 },
]

export const findDestination = (code) => DESTINATIONS.find((d) => d.code === code)

/** Etiquetas visuales de las ofertas. */
export const TAGS = {
  error: { label: 'Error Fare', tone: 'rose' },
  minimo: { label: 'Mínimo histórico', tone: 'emerald' },
  directo: { label: 'Vuelo directo', tone: 'sky' },
  flash: { label: 'Flash 24h', tone: 'amber' },
  finde: { label: 'Escapada finde', tone: 'violet' },
}

const AIRLINES = ['Ryanair', 'Vueling', 'easyJet', 'Wizz Air', 'Iberia Express', 'TAP', 'Transavia', 'Volotea']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Plantillas de los "Chollos del día"
const DEAL_TEMPLATES = [
  { dest: 'LIS', tags: ['error', 'directo'], discount: 0.62, nights: 3, out: '14 nov', back: '17 nov' },
  { dest: 'FCO', tags: ['minimo', 'directo'], discount: 0.48, nights: 4, out: '28 nov', back: '2 dic' },
  { dest: 'PRG', tags: ['flash'], discount: 0.41, nights: 3, out: '5 dic', back: '8 dic' },
  { dest: 'RAK', tags: ['error', 'minimo'], discount: 0.7, nights: 5, out: '12 ene', back: '17 ene' },
  { dest: 'STN', tags: ['directo', 'finde'], discount: 0.35, nights: 2, out: '21 nov', back: '23 nov' },
  { dest: 'BUD', tags: ['minimo'], discount: 0.44, nights: 4, out: '9 ene', back: '13 ene' },
  { dest: 'ATH', tags: ['flash', 'directo'], discount: 0.39, nights: 5, out: '20 feb', back: '25 feb' },
  { dest: 'BER', tags: ['finde'], discount: 0.3, nights: 2, out: '7 nov', back: '9 nov' },
]

/** Devuelve los chollos del día para un origen dado. */
export function getDeals(originCode) {
  const origin = ORIGINS.find((o) => o.code === originCode) ?? ORIGINS[0]
  return DEAL_TEMPLATES.map((t, i) => {
    const d = findDestination(t.dest)
    const rnd = seeded(origin.code + t.dest)
    const price = Math.max(9, Math.round(d.base * origin.factor * (1 - t.discount * 0.5)))
    const oldPrice = Math.round(price / (1 - t.discount))
    const stay = Math.round(14 + rnd() * 30)
    return {
      id: `deal-${origin.code}-${t.dest}`,
      type: 'deal',
      origin,
      ...d,
      tags: t.tags,
      price,
      oldPrice,
      outDate: t.out,
      backDate: t.back,
      nights: t.nights,
      stayPerNight: stay,
      airline: AIRLINES[(i + origin.code.length) % AIRLINES.length],
      stops: t.tags.includes('directo') ? 0 : rnd() > 0.5 ? 1 : 0,
      duration: Math.round(110 + rnd() * 130),
      seatsLeft: Math.round(2 + rnd() * 9),
      expiresInH: Math.round(3 + rnd() * 30),
    }
  })
}

/**
 * Histórico de precios simulado: paseo aleatorio suavizado que termina en
 * el precio actual, de modo que el gráfico sea coherente con la oferta.
 */
export function getPriceHistory(id, current, oldPrice, days = 90) {
  const rnd = seeded(id + days)
  const pts = []
  let v = oldPrice
  for (let i = 0; i < days; i++) {
    v += (rnd() - 0.5) * oldPrice * 0.12 + (oldPrice * 0.95 - v) * 0.08
    pts.push(Math.max(current * 1.05, v))
  }
  // Tramo final: caída hacia el precio actual
  const tail = Math.min(10, days)
  for (let i = 0; i < tail; i++) {
    const k = (i + 1) / tail
    pts[days - tail + i] = pts[days - tail + i] * (1 - k) + current * k
  }
  const today = new Date()
  return pts.map((p, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - i))
    return { date, price: Math.round(p) }
  })
}

/** Precio más barato por mes para la búsqueda flexible ("Mes más barato"). */
export function getMonthlyPrices(origin, dest) {
  const rnd = seeded(`${origin}-${dest}-months`)
  const base = findDestination(dest)?.base ?? 40
  const now = new Date()
  return Array.from({ length: 8 }, (_, i) => {
    const m = (now.getMonth() + i + 1) % 12
    const season = [6, 7, 11].includes(m) ? 1.6 : [0, 1, 10].includes(m) ? 0.75 : 1
    return { month: MONTHS[m], index: m, price: Math.round(base * season * (0.7 + rnd() * 0.6)) }
  })
}

// --- Resultados de búsqueda -------------------------------------------------

const STAY_NAMES = {
  hostel: ['Generator', 'Selina', 'Lost Inn Hostel', 'Goodmorning Hostel', 'The Yellow', 'Wombat’s City'],
  apartment: ['Apartamento Centro', 'Loft con terraza', 'Estudio junto al metro', 'Piso luminoso casco antiguo'],
  hotel: ['Hotel Ibis Budget', 'B&B Hotel', 'Moxy Downtown', 'Hotel Boutique 3★', 'Hotel Ríver 4★'],
}
const STAY_IMAGES = {
  hostel: img('1555854877-bab0e564b8d5', 600),
  apartment: img('1522708323590-d24dbb6b0267', 600),
  hotel: img('1566073771259-6a8506099945', 600),
}
export const STAY_TYPES = {
  hostel: 'Hostal',
  apartment: 'Apartamento',
  hotel: 'Hotel',
}
export const TRANSPORT_TYPES = {
  train: 'Tren',
  bus: 'Autobús',
  carpool: 'Coche compartido',
}

const fmtTime = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * Genera vuelos, alojamientos y transporte alternativo para una búsqueda.
 * @param {{origin:string,dest:string,travelers:number,flex:string}} q
 */
export function searchTrips(q) {
  const dest = findDestination(q.dest) ?? DESTINATIONS[0]
  const origin = ORIGINS.find((o) => o.code === q.origin) ?? ORIGINS[0]
  const rnd = seeded(`${origin.code}-${dest.code}-${q.flex}-${q.date ?? ''}`)
  const flexDiscount = q.flex === 'exact' ? 1 : 0.85

  const flights = Array.from({ length: 8 }, (_, i) => {
    const stops = rnd() > 0.6 ? 1 : 0
    const dep = Math.round(6 * 60 + rnd() * 15 * 60)
    const duration = Math.round(100 + rnd() * 120 + stops * (70 + rnd() * 120))
    const price = Math.round(dest.base * origin.factor * flexDiscount * (0.55 + rnd() * 1.1) + stops * -6)
    return {
      id: `fl-${origin.code}-${dest.code}-${i}-${q.flex}`,
      type: 'flight',
      airline: AIRLINES[Math.floor(rnd() * AIRLINES.length)],
      from: origin.code,
      to: dest.code,
      depart: fmtTime(dep),
      arrive: fmtTime(dep + duration),
      duration,
      stops,
      bag: rnd() > 0.7,
      price: Math.max(11 + Math.round(rnd() * 9), price),
      oldPrice: Math.max(20, price) + Math.round(10 + rnd() * 40),
      image: dest.image,
      city: dest.city,
      country: dest.country,
      tags: [stops === 0 ? 'directo' : null, rnd() > 0.85 ? 'error' : null].filter(Boolean),
    }
  })

  const stays = []
  for (const kind of Object.keys(STAY_NAMES)) {
    STAY_NAMES[kind].forEach((name, i) => {
      const mult = kind === 'hostel' ? 0.5 : kind === 'apartment' ? 1.1 : 1.4
      const price = Math.round((14 + rnd() * 40) * mult + 6)
      stays.push({
        id: `st-${dest.code}-${kind}-${i}`,
        type: 'stay',
        kind,
        name: `${name} ${dest.city}`,
        image: STAY_IMAGES[kind],
        city: dest.city,
        country: dest.country,
        rating: Math.round((6.8 + rnd() * 3) * 10) / 10,
        reviews: Math.round(80 + rnd() * 3200),
        distance: Math.round((0.2 + rnd() * 3.5) * 10) / 10,
        freeCancel: rnd() > 0.45,
        breakfast: kind !== 'apartment' && rnd() > 0.6,
        price,
        oldPrice: price + Math.round(5 + rnd() * 25),
        tags: rnd() > 0.8 ? ['flash'] : [],
      })
    })
  }

  // Transporte alternativo: solo tiene sentido en destinos "alcanzables" por tierra
  const landKm = { LIS: 625, CDG: 1270, FCO: 1950, BER: 2300, AMS: 1770, RAK: 1050 }[dest.code]
  const transport = landKm
    ? [
        { kind: 'train', operator: 'Renfe + SNCF', speed: 115, eurKm: 0.065, co2: 14 },
        { kind: 'bus', operator: 'FlixBus', speed: 72, eurKm: 0.035, co2: 27 },
        { kind: 'bus', operator: 'ALSA', speed: 68, eurKm: 0.04, co2: 29 },
        { kind: 'carpool', operator: 'BlaBlaCar', speed: 95, eurKm: 0.045, co2: 55 },
      ].map((t, i) => {
        const price = Math.round(landKm * t.eurKm * (0.8 + rnd() * 0.4))
        return {
          id: `tr-${origin.code}-${dest.code}-${i}`,
          type: 'transport',
          ...t,
          from: origin.city,
          to: dest.city,
          city: dest.city,
          country: dest.country,
          image: dest.image,
          duration: Math.round((landKm / t.speed) * 60),
          price,
          oldPrice: price + Math.round(4 + rnd() * 15),
          co2: Math.round((landKm * t.co2) / 1000),
          tags: [],
        }
      })
    : []

  return { origin, dest, flights, stays, transport, flightCo2: Math.round(((landKm ?? 2000) * 160) / 1000) }
}

/** Alertas de ejemplo con las que arranca la app. */
export const DEFAULT_ALERTS = [
  { id: 'al-1', origin: 'MAD', dest: 'LIS', target: 30, current: 26, active: true, createdAt: '2026-10-02' },
  { id: 'al-2', origin: 'MAD', dest: 'IST', target: 60, current: 71, active: true, createdAt: '2026-09-18' },
  { id: 'al-3', origin: 'BCN', dest: 'AMS', target: 40, current: 52, active: false, createdAt: '2026-08-30' },
]

export const NOTIFICATIONS = [
  { id: 'n1', title: 'Madrid → Lisboa bajó a 26 €', body: 'Por debajo de tu precio objetivo (30 €). ¡Corre!', ago: 'hace 12 min', kind: 'drop' },
  { id: 'n2', title: 'Error fare detectado: Marrakech', body: 'Ida y vuelta por 19 €. Suele durar pocas horas.', ago: 'hace 2 h', kind: 'error' },
  { id: 'n3', title: 'Estambul: el precio subió un 8%', body: 'Seguimos vigilando. Te avisaremos si baja.', ago: 'ayer', kind: 'up' },
]
