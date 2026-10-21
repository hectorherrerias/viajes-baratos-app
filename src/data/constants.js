// Constantes de la app y enlaces a proveedores de alojamiento.

/** Etiquetas de ofertas. Todas se calculan en el servidor con datos reales. */
export const TAGS = {
  error: { label: 'Posible error fare', tone: 'rose', hint: 'Ha caído a la mitad o menos respecto al precio registrado' },
  minimo: { label: 'Mínimo registrado', tone: 'emerald', hint: 'El precio más bajo desde que vigilamos la ruta' },
  bajada: { label: 'Bajada de precio', tone: 'amber', hint: 'Más barato que en la última consulta' },
  superchollo: { label: 'Superchollo', tone: 'violet', hint: 'Ida y vuelta por 30 € o menos' },
  directo: { label: 'Vuelo directo', tone: 'sky', hint: 'Sin escalas' },
  finde: { label: 'Escapada finde', tone: 'violet', hint: 'Salida jueves o viernes, hasta 3 noches' },
}

export const STAY_TYPES = { hostel: 'Hostal', apartment: 'Apartamento', hotel: 'Hotel' }
export const TRANSPORT_TYPES = { train: 'Tren', bus: 'Autobús', carpool: 'Coche compartido' }

/** Aeropuertos de origen por defecto (se sustituyen por los de la API al cargar). */
export const FALLBACK_ORIGINS = [
  { code: 'MAD', city: 'Madrid' },
  { code: 'BCN', city: 'Barcelona' },
  { code: 'VLC', city: 'Valencia' },
  { code: 'AGP', city: 'Málaga' },
  { code: 'SVQ', city: 'Sevilla' },
  { code: 'ALC', city: 'Alicante' },
]

const BOOKING_TYPES = { hostel: 203, apartment: 201, hotel: 204 }

/**
 * Enlaces de búsqueda real de alojamiento con los filtros del usuario aplicados.
 * @param {{city:string, checkin:string, checkout:string, adults:number, maxPrice:number|null, types:string[], minRating:number, freeCancel:boolean, hw?:{id:string, city:string, country:string}}} f
 */
export function stayLinks(f) {
  const nflt = [
    ...f.types.map((t) => `ht_id=${BOOKING_TYPES[t]}`),
    f.minRating ? `review_score=${f.minRating * 10}` : null,
    f.freeCancel ? 'fc=2' : null,
    f.maxPrice ? `price=EUR-min-${f.maxPrice}-1` : null,
  ].filter(Boolean)

  const booking = new URLSearchParams({
    ss: f.city, checkin: f.checkin, checkout: f.checkout, group_adults: f.adults, no_rooms: 1, group_children: 0,
    order: 'price', selected_currency: 'EUR',
  })
  if (nflt.length) booking.set('nflt', nflt.join(';'))

  const airbnb = new URLSearchParams({ checkin: f.checkin, checkout: f.checkout, adults: f.adults })
  if (f.maxPrice) airbnb.set('price_max', f.maxPrice)
  if (f.types.length === 1 && f.types[0] === 'apartment') airbnb.append('room_types[]', 'Entire home/apt')
  if (f.types.includes('hostel') && !f.types.includes('apartment')) airbnb.append('room_types[]', 'Shared room')

  // Hostelworld necesita el id interno de la ciudad (lo resuelve /api/hostelworld)
  const hostelworld = f.hw?.id
    ? `https://www.hostelworld.com/pwa/wds/s?${new URLSearchParams({ q: `${f.hw.city}, ${f.hw.country}`, country: f.hw.country, city: f.hw.city, type: 'city', id: f.hw.id, from: f.checkin, to: f.checkout, guests: f.adults, page: 1 })}`
    : 'https://www.hostelworld.com/'

  return [
    { id: 'booking', name: 'Booking.com', note: 'Hoteles, hostales y apartamentos · ordenado por precio', url: `https://www.booking.com/searchresults.es.html?${booking}` },
    { id: 'hostelworld', name: 'Hostelworld', note: 'Especialista en hostales y albergues', url: hostelworld },
    { id: 'airbnb', name: 'Airbnb', note: 'Apartamentos y habitaciones privadas', url: `https://www.airbnb.es/s/${encodeURIComponent(f.city)}/homes?${airbnb}` },
  ]
}
