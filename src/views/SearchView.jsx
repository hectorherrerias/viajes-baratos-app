// Buscador avanzado + comparador low-cost con precios reales
// (vuelos Ryanair, buses/trenes FlixBus y enlaces filtrados a Booking/Airbnb/Hostelworld)
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight, CalendarDays, Users, Minus, Plus, Search, SlidersHorizontal, Plane, BedDouble, TrainFront,
  MapPin, ChevronLeft, ArrowUpDown, Globe, Sparkles, Moon, WifiOff, Info,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { apiUrl, useApi } from '../lib/api'
import { stayLinks, STAY_TYPES } from '../data/constants'
import { Header } from '../components/Navigation'
import { Card, Chip, Segmented, EmptyState } from '../components/ui'
import { Cover, FlightCard, TransportCard, StayProviderCard } from '../components/Cards'
import { FilterSheet, DEFAULT_FILTERS, MAX_FLIGHT, MAX_STAY, DEPARTURES, countActive, inDeparture } from '../components/FilterSheet'
import { addDays, cx, fmtDay, fmtMonth, todayIso } from '../lib/format'

const SORTS = [
  { id: 'price', label: 'Precio' },
  { id: 'date', label: 'Fecha' },
  { id: 'duration', label: 'Duración' },
]

/** Próximos 6 meses en formato YYYY-MM. */
function nextMonths() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)).toISOString().slice(0, 7))
}

export function SearchView({ onOpen, preset }) {
  const { origin: defaultOrigin, origins } = useApp()
  const [form, setForm] = useState(() => ({
    origin: defaultOrigin,
    dest: 'ANY',
    dateMode: 'flex', // 'exact' | 'flex'
    flexOpt: 'any', // 'any' | 'month'
    month: nextMonths()[1],
    out: addDays(todayIso(), 21),
    back: addDays(todayIso(), 24),
    nights: 3,
    travelers: 1,
  }))
  const [query, setQuery] = useState(null)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Si cambia el origen global y no hay búsqueda abierta, sincroniza el formulario
  useEffect(() => {
    if (!query) set({ origin: defaultOrigin, dest: 'ANY' })
  }, [defaultOrigin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Permite lanzar una búsqueda desde otras pantallas (p. ej. "Comparar alojamiento y transporte")
  useEffect(() => {
    if (preset) run({ ...form, ...preset })
  }, [preset]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: routes } = useApi(apiUrl('/api/routes', { origin: form.origin }))
  const monthsUrl = form.dest !== 'ANY' && form.dateMode === 'flex' && form.flexOpt === 'month' ? apiUrl('/api/months', { origin: form.origin, dest: form.dest, nights: form.nights }) : null
  const { data: monthPrices, loading: monthsLoading } = useApi(monthsUrl)

  function run(f = form) {
    setForm(f)
    setQuery({
      origin: f.origin,
      dest: f.dest,
      mode: f.dateMode === 'exact' ? 'exact' : f.flexOpt,
      out: f.dateMode === 'exact' ? f.out : undefined,
      back: f.dateMode === 'exact' ? f.back : undefined,
      month: f.dateMode === 'flex' && f.flexOpt === 'month' ? f.month : undefined,
      nights: f.nights,
      adults: f.travelers,
    })
  }

  if (query) {
    return <Results query={query} onBack={() => setQuery(null)} onOpen={onOpen} onPickDest={(code) => run({ ...form, dest: code })} />
  }

  const months = monthPrices ?? nextMonths().map((month) => ({ month, price: null }))
  const canSwap = form.dest !== 'ANY' && origins.some((o) => o.code === form.dest)

  return (
    <div className="pb-28">
      <Header title="Buscar" subtitle="Vuelos, buses y alojamiento" />

      <div className="space-y-3 px-5">
        {/* Origen / destino */}
        <Card className="relative p-1">
          <Field icon={MapPin} label="Origen">
            <select value={form.origin} onChange={(e) => set({ origin: e.target.value, dest: 'ANY' })} className="w-full bg-transparent font-bold outline-none dark:[color-scheme:dark]">
              {origins.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.city} ({o.code})
                </option>
              ))}
            </select>
          </Field>
          <div className="mx-4 h-px bg-slate-100 dark:bg-ink-700" />
          <Field icon={Plane} label={routes ? `Destino · ${routes.length} rutas directas` : 'Destino'}>
            <select value={form.dest} onChange={(e) => set({ dest: e.target.value })} className="w-full bg-transparent font-bold outline-none dark:[color-scheme:dark]">
              <option value="ANY">🌍 Cualquier destino</option>
              {(routes ?? []).map((d) => (
                <option key={d.code} value={d.code}>
                  {d.city}, {d.country} ({d.code})
                </option>
              ))}
            </select>
          </Field>
          <button
            aria-label="Intercambiar origen y destino"
            disabled={!canSwap}
            onClick={() => set({ origin: form.dest, dest: form.origin })}
            className="absolute top-1/2 right-4 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition active:rotate-180 disabled:opacity-40 dark:border-ink-600 dark:bg-ink-700"
          >
            <ArrowLeftRight size={17} className="rotate-90" />
          </button>
        </Card>

        {/* Fechas */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <CalendarDays size={17} className="text-brand-500" /> Fechas
          </div>
          <Segmented
            value={form.dateMode}
            onChange={(v) => set({ dateMode: v })}
            options={[
              { value: 'flex', label: 'Flexibles' },
              { value: 'exact', label: 'Exactas' },
            ]}
          />
          {form.dateMode === 'exact' ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <DateInput label="Ida" value={form.out} min={addDays(todayIso(), 1)} onChange={(v) => set({ out: v, back: v >= form.back ? addDays(v, 1) : form.back })} />
              <DateInput label="Vuelta" value={form.back} min={addDays(form.out, 1)} onChange={(v) => set({ back: v })} />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Chip active={form.flexOpt === 'any'} onClick={() => set({ flexOpt: 'any' })} icon={Sparkles}>
                  Cualquier fecha
                </Chip>
                <Chip active={form.flexOpt === 'month'} onClick={() => set({ flexOpt: 'month' })} icon={CalendarDays}>
                  Mes más barato
                </Chip>
              </div>
              {form.flexOpt === 'month' && (
                <MonthBars months={months} loading={monthsLoading} selected={form.month} onSelect={(m) => set({ month: m })} hint={form.dest === 'ANY' ? 'Elige un destino para ver el precio de cada mes' : null} />
              )}
              <Stepper icon={Moon} label="Noches" value={form.nights} min={1} max={14} onChange={(v) => set({ nights: v })} />
            </div>
          )}
        </Card>

        {/* Viajeros */}
        <Card className="p-4">
          <Stepper icon={Users} label="Viajeros" value={form.travelers} min={1} max={9} onChange={(v) => set({ travelers: v })} />
        </Card>

        <button
          onClick={() => run()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-base font-bold text-white shadow-xl shadow-brand-500/30 transition active:scale-[0.98]"
        >
          <Search size={19} /> Buscar chollos
        </button>
        <p className="flex items-start gap-1.5 px-1 text-[11px] text-slate-500">
          <Info size={13} className="mt-px shrink-0" /> Precios reales de vuelos directos de Ryanair y buses de FlixBus. El alojamiento se busca en Booking, Hostelworld y Airbnb con tus filtros.
        </p>
      </div>
    </div>
  )
}

// --- Resultados + comparador ------------------------------------------------

function Results({ query, onBack, onOpen, onPickDest }) {
  const { price, cityOf } = useApp()
  const [tab, setTab] = useState('flights')
  const [sort, setSort] = useState('price')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sheet, setSheet] = useState(false)
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))

  const isAny = query.dest === 'ANY'
  const { data, loading, error, reload } = useApi(apiUrl(isAny ? '/api/anywhere' : '/api/trips', { ...query, dest: isAny ? undefined : query.dest }))

  const flights = useMemo(() => {
    if (isAny || !data?.flights) return []
    const by = {
      price: (a, b) => a.price - b.price,
      date: (a, b) => a.outDate.localeCompare(b.outDate),
      duration: (a, b) => a.duration + a.back.duration - (b.duration + b.back.duration),
    }[sort]
    return data.flights
      .filter((f) => (filters.maxFlight >= MAX_FLIGHT || f.price <= filters.maxFlight) && inDeparture(f.depart, filters.departure))
      .sort(by)
  }, [data, filters, sort, isAny])

  const destList = useMemo(() => (isAny && Array.isArray(data) ? data.filter((d) => filters.maxFlight >= MAX_FLIGHT || d.price <= filters.maxFlight) : []), [data, filters, isAny])

  // Fechas de referencia para buses y alojamiento: las elegidas o las del vuelo más barato
  const best = flights[0] ?? data?.flights?.[0]
  const checkin = query.mode === 'exact' ? query.out : best?.outDate
  const checkout = query.mode === 'exact' ? query.back : best?.backDate
  const destCity = data?.dest?.city
  const originCity = data?.origin?.city ?? cityOf(query.origin)

  const busUrl = !isAny && destCity && checkin ? apiUrl('/api/buses', { from: originCity, to: destCity, date: checkin, adults: query.adults }) : null
  const { data: busList, loading: busLoading } = useApi(busUrl)
  const transport = useMemo(
    () => (busList ?? []).filter((t) => filters.maxFlight >= MAX_FLIGHT || t.price * 2 <= filters.maxFlight).sort((a, b) => (sort === 'duration' ? a.duration - b.duration : a.price - b.price)),
    [busList, filters, sort]
  )

  // Id de ciudad de Hostelworld (su API de sugerencias admite CORS, se consulta desde el navegador)
  const { data: hwList } = useApi(!isAny && destCity ? `https://prod.apigee.hostelworld.com/legacy-hwapi-service/2.2/suggestions/?text=${encodeURIComponent(destCity)}` : null)
  const hwCity = Array.isArray(hwList) ? hwList.find((x) => x.type === 'city') : null
  const hw = hwCity ? { id: hwCity.id, city: hwCity.city.name, country: hwCity.city.country } : null
  const providers =
    destCity && checkin
      ? stayLinks({
          city: destCity,
          checkin,
          checkout,
          adults: query.adults,
          maxPrice: filters.maxStay < MAX_STAY ? filters.maxStay : null,
          types: filters.stayTypes,
          minRating: filters.minRating,
          freeCancel: filters.freeCancel,
          hw,
        })
      : []

  const active = countActive(filters)
  const counts = { flights: flights.length, transport: transport.length }
  const dateLabel =
    query.mode === 'exact' ? `${fmtDay(query.out)} – ${fmtDay(query.back)}` : query.mode === 'month' ? `Mes más barato (${fmtMonth(query.month)})` : 'Cualquier fecha'

  return (
    <div className="pb-28">
      {/* Cabecera de resultados */}
      <div className="sticky top-0 z-30 bg-canvas/90 px-5 pt-4 pb-3 backdrop-blur-xl dark:bg-ink-900/90">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Volver" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white dark:border-ink-600 dark:bg-ink-800">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">
              {originCity} → {isAny ? 'Cualquier destino' : (destCity ?? query.dest)}
            </p>
            <p className="truncate text-xs text-slate-500">
              {dateLabel} · {query.mode === 'exact' ? '' : `${query.nights} noches · `}
              {query.adults} {query.adults > 1 ? 'viajeros' : 'viajero'}
            </p>
          </div>
        </div>
        {!isAny && (
          <Segmented
            className="mt-3"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'flights', label: 'Vuelos', icon: Plane, count: data ? counts.flights : null },
              { value: 'stays', label: 'Estancia', icon: BedDouble },
              { value: 'transport', label: 'Tierra', icon: TrainFront, count: busList ? counts.transport : null },
            ]}
          />
        )}
        {/* Filtros rápidos */}
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          <Chip icon={SlidersHorizontal} active={active > 0} onClick={() => setSheet(true)}>
            Filtros{active > 0 && ` · ${active}`}
          </Chip>
          {!isAny && tab !== 'stays' && (
            <Chip icon={ArrowUpDown} onClick={() => setSort(SORTS[(SORTS.findIndex((o) => o.id === sort) + 1) % SORTS.length].id)}>
              {SORTS.find((o) => o.id === sort).label}
            </Chip>
          )}
          {tab === 'stays' && !isAny ? (
            <>
              <Chip active={filters.freeCancel} onClick={() => set({ freeCancel: !filters.freeCancel })}>Cancelación gratis</Chip>
              <Chip active={filters.minRating === 8} onClick={() => set({ minRating: filters.minRating === 8 ? 0 : 8 })}>8+ valoración</Chip>
              {Object.entries(STAY_TYPES).map(([k, label]) => (
                <Chip key={k} active={filters.stayTypes.includes(k)} onClick={() => set({ stayTypes: filters.stayTypes.includes(k) ? filters.stayTypes.filter((t) => t !== k) : [...filters.stayTypes, k] })}>
                  {label}
                </Chip>
              ))}
            </>
          ) : (
            <>
              {[50, 100].map((b) => (
                <Chip key={b} active={filters.maxFlight === b} onClick={() => set({ maxFlight: filters.maxFlight === b ? MAX_FLIGHT : b })}>
                  i/v &lt; {price(b, { decimals: 0 })}
                </Chip>
              ))}
              {!isAny && ['morning', 'night'].map((k) => (
                <Chip key={k} active={filters.departure === k} onClick={() => set({ departure: filters.departure === k ? 'any' : k })}>
                  Salida {DEPARTURES[k].label.toLowerCase()}
                </Chip>
              ))}
            </>
          )}
        </div>
      </div>

      {loading && !data ? (
        <Skeletons text={isAny ? 'Consultando todas las rutas directas…' : 'Consultando precios reales día a día…'} />
      ) : error && !data ? (
        <EmptyState icon={WifiOff} title="No hemos podido consultar los precios" text={error.message} action="Reintentar" onAction={reload} />
      ) : isAny ? (
        <div className="stagger space-y-3 px-5 pt-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Globe size={14} /> {destList.length} destinos ordenados por precio de ida y vuelta
          </p>
          {destList.map((d) => (
            <Card key={d.id} role="button" onClick={() => onPickDest(d.code)} className="flex items-center gap-3 overflow-hidden p-2.5 transition-transform active:scale-[0.99]">
              <Cover src={d.image} alt={d.city} className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{d.city}</p>
                <p className="truncate text-xs text-slate-500">{d.country}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {fmtDay(d.outDate)} – {fmtDay(d.backDate)} · {d.nights} noches
                </p>
              </div>
              <div className="pr-2 text-right">
                <p className="text-[11px] text-slate-500">i/v desde</p>
                <p className="text-xl font-extrabold text-brand-600 dark:text-brand-300">{price(d.price)}</p>
              </div>
            </Card>
          ))}
          {destList.length === 0 && <EmptyState icon={Globe} title="Sin vuelos para esas fechas" text="Prueba con fechas flexibles o sube el presupuesto." />}
        </div>
      ) : (
        <div className="space-y-3 px-5 pt-2">
          <ComboSummary data={data} flight={best} bus={busList?.[0]} travelers={query.adults} maxStay={filters.maxStay < MAX_STAY ? filters.maxStay : null} onTab={setTab} />

          {tab === 'flights' && (
            <div key={sort} className="stagger space-y-3">
              {flights.map((f, i) => (
                <FlightCard key={f.id} flight={f} cheapest={sort === 'price' && i === 0} onOpen={onOpen} />
              ))}
              {flights.length === 0 && (
                <EmptyState
                  icon={Plane}
                  title={data?.flights?.length ? 'Ningún vuelo con estos filtros' : 'Sin vuelos en esas fechas'}
                  text={data?.flights?.length ? 'Relaja los filtros para ver más opciones.' : 'Ryanair no opera esta ruta en esos días. Prueba con fechas flexibles.'}
                  action={data?.flights?.length ? 'Restablecer filtros' : null}
                  onAction={() => setFilters(DEFAULT_FILTERS)}
                />
              )}
            </div>
          )}

          {tab === 'stays' && (
            <div className="stagger space-y-3">
              {checkin ? (
                <>
                  <p className="text-xs text-slate-500">
                    Busca alojamiento del <b>{fmtDay(checkin)}</b> al <b>{fmtDay(checkout)}</b> en {destCity} con tus filtros
                    {filters.maxStay < MAX_STAY && <> (máx. {price(filters.maxStay)}/noche)</>}. Se abre la web del proveedor con precios en directo.
                  </p>
                  {providers.map((p) => (
                    <StayProviderCard key={p.id} provider={p} />
                  ))}
                </>
              ) : (
                <EmptyState icon={BedDouble} title="Primero elige fechas" text="No hay vuelos disponibles para calcular las fechas de la estancia." />
              )}
            </div>
          )}

          {tab === 'transport' && (
            <div className="stagger space-y-3">
              {checkin && <p className="text-xs text-slate-500">Buses y trenes FlixBus de ida el {fmtDay(checkin)} · {originCity} → {destCity}</p>}
              {busLoading && !busList && <Skeletons text="Consultando FlixBus…" />}
              {transport.map((t) => (
                <TransportCard key={t.id} item={t} flightPrice={best?.price} onOpen={onOpen} />
              ))}
              {busList && transport.length === 0 && (
                <EmptyState icon={TrainFront} title="Sin trayectos por tierra" text="FlixBus no tiene conexiones entre estas ciudades para esa fecha." />
              )}
            </div>
          )}
        </div>
      )}

      <FilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        filters={filters}
        setFilters={setFilters}
        resultLabel={isAny ? `Ver ${destList.length} destinos` : tab === 'stays' ? 'Aplicar' : `Ver ${tab === 'flights' ? flights.length : transport.length} resultados`}
      />
    </div>
  )
}

/** Desglose: vuelo real más barato + alternativa por tierra + presupuesto de alojamiento. */
function ComboSummary({ data, flight, bus, travelers, maxStay, onTab }) {
  const { price } = useApp()
  if (!flight) return null
  const flightTotal = flight.price * travelers
  const stayTotal = maxStay ? maxStay * flight.nights : null

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">Vuelo ida y vuelta más barato</p>
          <p className="text-3xl font-extrabold tracking-tight">{price(flightTotal)}</p>
          <p className="text-xs text-slate-500">
            {travelers > 1 ? `${price(flight.price)} por persona · ` : ''}
            {fmtDay(flight.outDate)} – {fmtDay(flight.backDate)} · {data.dest?.city}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Precio real
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Breakdown color="bg-brand-500" icon={Plane} label={`Ida ${price(flight.outPrice)}`} value={`Vuelta ${price(flight.back.price)}`} />
        <button onClick={() => onTab('stays')} className="text-left">
          <Breakdown color="bg-cyan-400" icon={BedDouble} label={`${flight.nights} noches`} value={stayTotal ? `máx. ${price(stayTotal)}` : 'Comparar precios →'} />
        </button>
      </div>
      {bus && (
        <button
          onClick={() => onTab('transport')}
          className={cx(
            'mt-3 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold',
            bus.price * 2 < flight.price ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-50 text-slate-600 dark:bg-ink-700 dark:text-slate-300'
          )}
        >
          {bus.price * 2 < flight.price
            ? `💡 En ${bus.operator} la ida cuesta ${price(bus.price)}: podrías ahorrar yendo por tierra.`
            : `Alternativa por tierra: ${bus.operator} desde ${price(bus.price)} la ida.`}
        </button>
      )}
    </Card>
  )
}

function Breakdown({ color, icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-ink-700/60">
      <span className={cx('h-8 w-1 shrink-0 rounded-full', color)} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-slate-500">
          <Icon size={12} className="shrink-0" /> <span className="truncate">{label}</span>
        </p>
        <p className="truncate font-bold">{value}</p>
      </div>
    </div>
  )
}

function Skeletons({ text }) {
  return (
    <div className="space-y-3 px-5 pt-2">
      {text && <p className="animate-pulse text-xs font-semibold text-slate-500">{text}</p>}
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-ink-800" />
      ))}
    </div>
  )
}

// --- Campos del formulario ----------------------------------------------------

function Field({ icon: Icon, label, children }) {
  return (
    <label className="flex items-center gap-3 px-4 py-3 pr-16">
      <Icon size={19} className="shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
        {children}
      </div>
    </label>
  )
}

function DateInput({ label, value, min, onChange }) {
  return (
    <label className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-ink-700/60">
      <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
      <input type="date" value={value} min={min} onChange={(e) => e.target.value && onChange(e.target.value)} className="w-full bg-transparent text-sm font-bold outline-none dark:[color-scheme:dark]" />
    </label>
  )
}

function Stepper({ icon: Icon, label, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-bold">
        <Icon size={17} className="text-brand-500" /> {label}
      </span>
      <div className="flex items-center gap-3">
        <button aria-label={`Menos ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 disabled:opacity-30 dark:border-ink-600">
          <Minus size={16} />
        </button>
        <span className="w-5 text-center font-extrabold tabular-nums">{value}</span>
        <button aria-label={`Más ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 disabled:opacity-30 dark:border-ink-600">
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

/** Barras con el precio real más bajo de ida y vuelta de cada mes. */
function MonthBars({ months, selected, onSelect, loading, hint }) {
  const { price } = useApp()
  const priced = months.filter((m) => m.price != null)
  const max = Math.max(1, ...priced.map((m) => m.price))
  const cheapest = priced.length ? priced.reduce((a, b) => (b.price < a.price ? b : a)).month : null
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {months.map((m) => {
          const isSel = selected === m.month
          const h = m.price != null ? (m.price / max) * 72 : loading ? 30 : 8
          return (
            <button key={m.month} onClick={() => onSelect(m.month)} className="flex flex-1 flex-col items-center gap-1">
              <span className={cx('text-[10px] font-bold', isSel ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400')}>
                {m.price != null ? price(m.price, { decimals: 0 }) : loading ? '…' : '—'}
              </span>
              <span
                className={cx(
                  'w-full rounded-lg transition-all',
                  loading && m.price == null && 'animate-pulse',
                  isSel ? 'bg-brand-500' : m.month === cheapest ? 'bg-emerald-400/70' : 'bg-slate-200 dark:bg-ink-600'
                )}
                style={{ height: `${h}px` }}
              />
              <span className={cx('text-[11px] font-semibold capitalize', isSel ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>{fmtMonth(m.month)}</span>
            </button>
          )
        })}
      </div>
      {hint && <p className="mt-1 text-center text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}
