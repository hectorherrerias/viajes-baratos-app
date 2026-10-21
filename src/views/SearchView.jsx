// Buscador avanzado + comparador low-cost (vuelos, alojamiento, transporte)
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight, CalendarDays, Users, Minus, Plus, Search, SlidersHorizontal, Plane, BedDouble, TrainFront,
  MapPin, ChevronLeft, ArrowUpDown, Globe, Sparkles, Moon,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DESTINATIONS, ORIGINS, getMonthlyPrices, searchTrips } from '../data/mockData'
import { Header } from '../components/Navigation'
import { Card, Chip, Segmented, EmptyState } from '../components/ui'
import { Cover, FlightCard, StayCard, TransportCard } from '../components/Cards'
import { FilterSheet, DEFAULT_FILTERS, countActive } from '../components/FilterSheet'
import { cx } from '../lib/format'

const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return iso(d)
}

const SORTS = {
  flights: [
    { id: 'price', label: 'Precio' },
    { id: 'duration', label: 'Duración' },
  ],
  stays: [
    { id: 'price', label: 'Precio' },
    { id: 'rating', label: 'Valoración' },
    { id: 'distance', label: 'Distancia' },
  ],
  transport: [
    { id: 'price', label: 'Precio' },
    { id: 'duration', label: 'Duración' },
  ],
}

export function SearchView({ onOpen, preset }) {
  const { origin: defaultOrigin } = useApp()
  const [form, setForm] = useState({
    origin: defaultOrigin,
    dest: 'ANY',
    dateMode: 'flex', // 'exact' | 'flex'
    flexOpt: 'any', // 'any' | 'month'
    month: null,
    out: addDays(21),
    back: addDays(24),
    nights: 3,
    travelers: 1,
  })
  const [query, setQuery] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Si cambia el origen global y no hay búsqueda abierta, sincroniza el formulario
  useEffect(() => {
    if (!query) set({ origin: defaultOrigin })
  }, [defaultOrigin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Permite lanzar una búsqueda desde otras pantallas (p. ej. "Ver opciones")
  useEffect(() => {
    if (preset) run({ ...form, ...preset })
  }, [preset]) // eslint-disable-line react-hooks/exhaustive-deps

  const nights =
    form.dateMode === 'exact' ? Math.max(1, Math.round((new Date(form.back) - new Date(form.out)) / 864e5)) : form.nights

  function run(f = form) {
    setForm(f)
    setLoading(true)
    setQuery({ ...f, flex: f.dateMode === 'exact' ? 'exact' : f.flexOpt, date: f.dateMode === 'exact' ? f.out : f.month })
    setTimeout(() => setLoading(false), 650) // simula la latencia de la API
  }

  if (query) {
    return (
      <Results
        query={query}
        nights={nights}
        loading={loading}
        onBack={() => setQuery(null)}
        onOpen={onOpen}
        onPickDest={(code) => run({ ...form, dest: code })}
      />
    )
  }

  const months = form.dest !== 'ANY' ? getMonthlyPrices(form.origin, form.dest) : getMonthlyPrices(form.origin, 'LIS')
  const cheapestMonth = months.reduce((a, b) => (b.price < a.price ? b : a))

  return (
    <div className="pb-28">
      <Header title="Buscar" subtitle="Vuelos, alojamiento y transporte" />

      <div className="space-y-3 px-5 animate-fade-up">
        {/* Origen / destino */}
        <Card className="relative p-1">
          <Field icon={MapPin} label="Origen">
            <select value={form.origin} onChange={(e) => set({ origin: e.target.value })} className="w-full bg-transparent font-bold outline-none">
              {ORIGINS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.city} ({o.code})
                </option>
              ))}
            </select>
          </Field>
          <div className="mx-4 h-px bg-slate-100 dark:bg-ink-700" />
          <Field icon={Plane} label="Destino">
            <select value={form.dest} onChange={(e) => set({ dest: e.target.value })} className="w-full bg-transparent font-bold outline-none">
              <option value="ANY">🌍 Cualquier destino</option>
              {DESTINATIONS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.city}, {d.country}
                </option>
              ))}
            </select>
          </Field>
          <button
            aria-label="Intercambiar origen y destino"
            disabled={form.dest === 'ANY' || !ORIGINS.some((o) => o.code === form.dest)}
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
              <DateInput label="Ida" value={form.out} min={addDays(0)} onChange={(v) => set({ out: v, back: v > form.back ? v : form.back })} />
              <DateInput label="Vuelta" value={form.back} min={form.out} onChange={(v) => set({ back: v })} />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Chip active={form.flexOpt === 'any'} onClick={() => set({ flexOpt: 'any', month: null })} icon={Sparkles}>
                  Cualquier fecha
                </Chip>
                <Chip active={form.flexOpt === 'month'} onClick={() => set({ flexOpt: 'month', month: form.month ?? cheapestMonth.month })} icon={CalendarDays}>
                  Mes más barato
                </Chip>
              </div>
              {form.flexOpt === 'month' && (
                <MonthBars months={months} selected={form.month} cheapest={cheapestMonth.month} onSelect={(m) => set({ month: m })} />
              )}
              <Stepper icon={Moon} label="Noches" value={form.nights} min={1} max={21} onChange={(v) => set({ nights: v })} />
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
      </div>
    </div>
  )
}

// --- Resultados + comparador ------------------------------------------------

function Results({ query, nights, loading, onBack, onOpen, onPickDest }) {
  const { price } = useApp()
  const [tab, setTab] = useState('flights')
  const [sort, setSort] = useState('price')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sheet, setSheet] = useState(false)
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))

  const data = useMemo(() => (query.dest === 'ANY' ? null : searchTrips(query)), [query])

  // Explorar "Cualquier destino": ranking de destinos por precio mínimo
  const explore = useMemo(() => {
    if (query.dest !== 'ANY') return null
    return DESTINATIONS.map((d) => {
      const r = searchTrips({ ...query, dest: d.code })
      return { ...d, from: Math.min(...r.flights.map((f) => f.price)), stay: Math.min(...r.stays.map((s) => s.price)) }
    }).sort((a, b) => a.from - b.from)
  }, [query])

  const lists = useMemo(() => {
    if (!data) return null
    const sorter = (a, b) => (sort === 'rating' ? b.rating - a.rating : (a[sort] ?? a.price) - (b[sort] ?? b.price))
    const flights = data.flights
      .filter((f) => (filters.maxFlight >= 200 || f.price <= filters.maxFlight) && (!filters.directOnly || f.stops === 0))
      .sort(sorter)
    const stays = data.stays
      .filter(
        (s) =>
          (filters.maxStay >= 120 || s.price <= filters.maxStay) &&
          (filters.stayTypes.length === 0 || filters.stayTypes.includes(s.kind)) &&
          s.rating >= filters.minRating &&
          (!filters.freeCancel || s.freeCancel)
      )
      .sort(sorter)
    const transport = data.transport.filter((t) => filters.maxFlight >= 200 || t.price <= filters.maxFlight).sort(sorter)
    return { flights, stays, transport }
  }, [data, filters, sort])

  const active = countActive(filters)

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
              {query.origin} → {query.dest === 'ANY' ? 'Cualquier destino' : data.dest.city}
            </p>
            <p className="truncate text-xs text-slate-500">
              {query.flex === 'exact' ? `${query.out} · ${query.back}` : query.flex === 'month' ? `Mes más barato (${query.month})` : 'Cualquier fecha'} ·{' '}
              {nights} noches · {query.travelers} {query.travelers > 1 ? 'viajeros' : 'viajero'}
            </p>
          </div>
        </div>
        {data && (
          <>
            <Segmented
              className="mt-3"
              value={tab}
              onChange={(v) => {
                setTab(v)
                setSort('price')
              }}
              options={[
                { value: 'flights', label: 'Vuelos', icon: Plane, count: lists.flights.length },
                { value: 'stays', label: 'Estancia', icon: BedDouble, count: lists.stays.length },
                { value: 'transport', label: 'Tierra', icon: TrainFront, count: lists.transport.length },
              ]}
            />
            {/* Filtros rápidos */}
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
              <Chip icon={SlidersHorizontal} active={active > 0} onClick={() => setSheet(true)}>
                Filtros{active > 0 && ` · ${active}`}
              </Chip>
              <Chip icon={ArrowUpDown} onClick={() => {
                const opts = SORTS[tab]
                setSort(opts[(opts.findIndex((o) => o.id === sort) + 1) % opts.length].id)
              }}>
                {SORTS[tab].find((o) => o.id === sort)?.label ?? 'Precio'}
              </Chip>
              {tab === 'flights' && (
                <Chip active={filters.directOnly} onClick={() => set({ directOnly: !filters.directOnly })}>Directos</Chip>
              )}
              {tab === 'stays' && (
                <>
                  <Chip active={filters.freeCancel} onClick={() => set({ freeCancel: !filters.freeCancel })}>Cancelación gratis</Chip>
                  <Chip active={filters.minRating === 8} onClick={() => set({ minRating: filters.minRating === 8 ? 0 : 8 })}>8+ valoración</Chip>
                  <Chip active={filters.stayTypes.includes('hostel')} onClick={() => set({ stayTypes: filters.stayTypes.includes('hostel') ? [] : ['hostel'] })}>Hostales</Chip>
                </>
              )}
              {[50, 100].map((b) => (
                <Chip key={b} active={(tab === 'stays' ? filters.maxStay : filters.maxFlight) === b / (tab === 'stays' ? 2 : 1)}
                  onClick={() => tab === 'stays'
                    ? set({ maxStay: filters.maxStay === b / 2 ? DEFAULT_FILTERS.maxStay : b / 2 })
                    : set({ maxFlight: filters.maxFlight === b ? DEFAULT_FILTERS.maxFlight : b })}>
                  &lt; {price(tab === 'stays' ? b / 2 : b)}
                </Chip>
              ))}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <Skeletons />
      ) : explore ? (
        <div className="stagger space-y-3 px-5 pt-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Globe size={14} /> {explore.length} destinos ordenados por precio
          </p>
          {explore.map((d) => (
            <Card key={d.code} role="button" onClick={() => onPickDest(d.code)} className="flex items-center gap-3 overflow-hidden p-2.5 active:scale-[0.99] transition-transform">
              <Cover src={d.image} alt={d.city} className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{d.city}</p>
                <p className="text-xs text-slate-500">{d.country}</p>
                <p className="mt-1 text-xs text-slate-500">Alojamiento desde {price(d.stay)}/noche</p>
              </div>
              <div className="pr-2 text-right">
                <p className="text-[11px] text-slate-500">vuelo desde</p>
                <p className="text-xl font-extrabold text-brand-600 dark:text-brand-300">{price(d.from)}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3 px-5 pt-2">
          <ComboSummary data={data} lists={lists} nights={nights} travelers={query.travelers} />
          <div key={tab + sort} className="stagger space-y-3">
            {tab === 'flights' && lists.flights.map((f, i) => <FlightCard key={f.id} flight={f} cheapest={sort === 'price' && i === 0} onOpen={onOpen} />)}
            {tab === 'stays' && lists.stays.map((s) => <StayCard key={s.id} stay={s} nights={nights} onOpen={onOpen} />)}
            {tab === 'transport' && lists.transport.map((t) => <TransportCard key={t.id} item={t} flightCo2={data.flightCo2} onOpen={onOpen} />)}
          </div>
          {lists[tab].length === 0 && (
            <EmptyState
              icon={tab === 'transport' ? TrainFront : SlidersHorizontal}
              title={tab === 'transport' && data.transport.length === 0 ? 'Sin rutas por tierra' : 'Ningún resultado'}
              text={tab === 'transport' && data.transport.length === 0 ? 'Este destino no tiene conexiones razonables en tren, bus o coche.' : 'Relaja los filtros para ver más opciones.'}
              action={tab === 'transport' && data.transport.length === 0 ? null : 'Restablecer filtros'}
              onAction={() => setFilters(DEFAULT_FILTERS)}
            />
          )}
        </div>
      )}

      {data && (
        <FilterSheet open={sheet} onClose={() => setSheet(false)} filters={filters} setFilters={setFilters} resultCount={lists[tab].length} />
      )}
    </div>
  )
}

/** Desglose inteligente: la combinación más barata de vuelo + alojamiento. */
function ComboSummary({ data, lists, nights, travelers }) {
  const { price } = useApp()
  const flight = [...lists.flights].sort((a, b) => a.price - b.price)[0]
  const stay = [...lists.stays].sort((a, b) => a.price - b.price)[0]
  const land = [...lists.transport].sort((a, b) => a.price - b.price)[0]
  if (!flight || !stay) return null

  const flightTotal = flight.price * travelers
  const stayTotal = stay.price * nights
  const total = flightTotal + stayTotal
  const pct = Math.round((flightTotal / total) * 100)

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">Viaje completo más barato</p>
          <p className="text-3xl font-extrabold tracking-tight">{price(total)}</p>
          <p className="text-xs text-slate-500">
            {price(total / travelers)} por persona · {nights} noches en {data.dest.city}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Mejor combo
        </span>
      </div>
      {/* Barra de desglose */}
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700">
        <div className="bg-brand-500" style={{ width: `${pct}%` }} />
        <div className="bg-cyan-400" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Breakdown color="bg-brand-500" icon={Plane} label={`${flight.airline} · ${flight.stops ? '1 escala' : 'directo'}`} value={price(flightTotal)} />
        <Breakdown color="bg-cyan-400" icon={BedDouble} label={stay.name.replace(` ${data.dest.city}`, '')} value={price(stayTotal)} />
      </div>
      {land && (
        <p className={cx('mt-3 rounded-xl px-3 py-2 text-xs font-semibold', land.price < flight.price ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-50 text-slate-600 dark:bg-ink-700 dark:text-slate-300')}>
          {land.price < flight.price
            ? `💡 Ahorra ${price((flight.price - land.price) * travelers)} yendo en ${land.operator} (${price(land.price)}).`
            : `Alternativa por tierra desde ${price(land.price)} con ${land.operator}.`}
        </p>
      )}
    </Card>
  )
}

function Breakdown({ color, icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-ink-700/60">
      <span className={cx('h-8 w-1 rounded-full', color)} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-slate-500">
          <Icon size={12} className="shrink-0" /> <span className="truncate">{label}</span>
        </p>
        <p className="font-bold">{value}</p>
      </div>
    </div>
  )
}

function Skeletons() {
  return (
    <div className="space-y-3 px-5 pt-2">
      {[0, 1, 2, 3].map((i) => (
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

/** Mini gráfico de barras con el precio mínimo de cada mes. */
function MonthBars({ months, selected, cheapest, onSelect }) {
  const { price } = useApp()
  const max = Math.max(...months.map((m) => m.price))
  return (
    <div className="flex h-32 items-end gap-1.5">
      {months.map((m) => {
        const isSel = selected === m.month
        return (
          <button key={m.month} onClick={() => onSelect(m.month)} className="flex flex-1 flex-col items-center gap-1">
            <span className={cx('text-[10px] font-bold', isSel ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400')}>{price(m.price)}</span>
            <span
              className={cx(
                'w-full rounded-lg transition-all',
                isSel ? 'bg-brand-500' : m.month === cheapest ? 'bg-emerald-400/70' : 'bg-slate-200 dark:bg-ink-600'
              )}
              style={{ height: `${(m.price / max) * 72}px` }}
            />
            <span className={cx('text-[11px] font-semibold capitalize', isSel ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>{m.month}</span>
          </button>
        )
      })}
    </div>
  )
}
