// Hoja de filtros avanzados: presupuesto, tipo de alojamiento, valoración, cancelación
import { BottomSheet, Chip, Toggle } from './ui'
import { STAY_TYPES } from '../data/mockData'
import { useApp } from '../context/AppContext'

export const DEFAULT_FILTERS = {
  maxFlight: 200,
  maxStay: 120,
  stayTypes: [], // vacío = todos
  minRating: 0,
  freeCancel: false,
  directOnly: false,
}

/** Número de filtros activos (para el badge del botón "Filtros"). */
export function countActive(f) {
  return (
    (f.maxFlight < DEFAULT_FILTERS.maxFlight) +
    (f.maxStay < DEFAULT_FILTERS.maxStay) +
    (f.stayTypes.length > 0) +
    (f.minRating > 0) +
    f.freeCancel +
    f.directOnly
  )
}

export function FilterSheet({ open, onClose, filters, setFilters, resultCount }) {
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
            Ver {resultCount} resultados
          </button>
        </div>
      }
    >
      <div className="space-y-6 pb-2">
        <Range
          label="Presupuesto máximo de vuelo"
          value={filters.maxFlight}
          min={20}
          max={200}
          step={5}
          display={price(filters.maxFlight)}
          onChange={(v) => set({ maxFlight: v })}
        />
        <Range
          label="Presupuesto máximo por noche"
          value={filters.maxStay}
          min={10}
          max={120}
          step={5}
          display={price(filters.maxStay)}
          onChange={(v) => set({ maxStay: v })}
        />

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
          <Row label="Cancelación gratuita" hint="Solo alojamientos reembolsables">
            <Toggle label="Cancelación gratuita" checked={filters.freeCancel} onChange={(v) => set({ freeCancel: v })} />
          </Row>
          <Row label="Solo vuelos directos" hint="Sin escalas">
            <Toggle label="Solo vuelos directos" checked={filters.directOnly} onChange={(v) => set({ directOnly: v })} />
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
