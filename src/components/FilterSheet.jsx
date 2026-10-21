// Hoja de filtros avanzados: presupuesto, tipo de alojamiento, valoración, cancelación
import { BottomSheet, Chip, Toggle } from './ui'
import { STAY_TYPES } from '../data/constants'
import { useApp } from '../context/AppContext'

export const MAX_FLIGHT = 300
export const MAX_STAY = 150

export const DEFAULT_FILTERS = {
  maxFlight: MAX_FLIGHT, // ida y vuelta por persona
  departure: 'any', // franja horaria de salida de la ida
  maxStay: MAX_STAY, // por noche (se aplica en Booking/Airbnb)
  stayTypes: [], // vacío = todos
  minRating: 0,
  freeCancel: false,
}

export const DEPARTURES = {
  any: { label: 'Cualquiera', from: 0, to: 24 },
  morning: { label: 'Mañana', from: 6, to: 12 },
  afternoon: { label: 'Tarde', from: 12, to: 18 },
  night: { label: 'Noche', from: 18, to: 24 },
}

/** ¿Sale la ida en la franja elegida? */
export const inDeparture = (hhmm, key) => {
  const h = Number(hhmm.slice(0, 2))
  const d = DEPARTURES[key] ?? DEPARTURES.any
  return h >= d.from && h < d.to
}

/** Número de filtros activos (para el badge del botón "Filtros"). */
export function countActive(f) {
  return (
    (f.maxFlight < MAX_FLIGHT) +
    (f.departure !== 'any') +
    (f.maxStay < MAX_STAY) +
    (f.stayTypes.length > 0) +
    (f.minRating > 0) +
    f.freeCancel
  )
}

export function FilterSheet({ open, onClose, filters, setFilters, resultLabel }) {
  const { price } = useApp()
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const toggleType = (t) =>
    set({ stayTypes: filters.stayTypes.includes(t) ? filters.stayTypes.filter((x) => x !== t) : [...filters.stayTypes, t] })

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <div className="flex gap-3">
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300">
            Restablecer
          </button>
          <button onClick={onClose} className="flex-1 rounded-2xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 active:scale-[0.98]">
            {resultLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-6 pb-2">
        <Range
          label="Vuelo i/v máximo por persona"
          value={filters.maxFlight}
          min={20}
          max={MAX_FLIGHT}
          step={5}
          display={price(filters.maxFlight)}
          onChange={(v) => set({ maxFlight: v })}
        />
        <Range
          label="Máximo por noche"
          value={filters.maxStay}
          min={10}
          max={MAX_STAY}
          step={5}
          display={price(filters.maxStay)}
          onChange={(v) => set({ maxStay: v })}
        />

        <section>
          <h4 className="mb-2.5 text-sm font-bold">Salida del vuelo de ida</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DEPARTURES).map(([k, d]) => (
              <Chip key={k} active={filters.departure === k} onClick={() => set({ departure: k })}>
                {d.label}
              </Chip>
            ))}
          </div>
        </section>

        <p className="-mb-3 border-t border-slate-100 pt-4 text-xs font-bold tracking-wider text-slate-400 uppercase dark:border-ink-700">Alojamiento</p>

        <section>
          <h4 className="mb-2.5 text-sm font-bold">Tipo de alojamiento</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STAY_TYPES).map(([k, label]) => (
              <Chip key={k} active={filters.stayTypes.includes(k)} onClick={() => toggleType(k)}>
                {label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-2.5 text-sm font-bold">Valoración mínima</h4>
          <div className="flex gap-2">
            {[0, 7, 8, 9].map((r) => (
              <Chip key={r} active={filters.minRating === r} onClick={() => set({ minRating: r })}>
                {r === 0 ? 'Cualquiera' : `${r}+`}
              </Chip>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <Row label="Cancelación gratuita" hint="Se aplica al buscar en Booking">
            <Toggle label="Cancelación gratuita" checked={filters.freeCancel} onChange={(v) => set({ freeCancel: v })} />
          </Row>
        </section>
      </div>
    </BottomSheet>
  )
}

function Range({ label, value, min, max, step, display, onChange }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-bold">{label}</h4>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          {value >= max ? 'Sin límite' : display}
        </span>
      </div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
    </section>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      {children}
    </div>
  )
}
