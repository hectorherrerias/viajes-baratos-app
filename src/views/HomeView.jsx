// Pantalla de inicio: buscador rápido, categorías y "Chollos del día" (precios reales)
import { useState } from 'react'
import { Search, Zap, Flame, TrendingDown, Plane, Sparkles, CalendarDays, BadgeEuro, RefreshCw, WifiOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { apiUrl, fetchedAt, useApi } from '../lib/api'
import { timeAgo } from '../lib/format'
import { Header } from '../components/Navigation'
import { DealCard } from '../components/Cards'
import { Chip, SectionHeader, EmptyState } from '../components/ui'

const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: Sparkles },
  { id: 'superchollo', label: '≤ 30 €', icon: BadgeEuro },
  { id: 'error', label: 'Error fare', icon: Zap },
  { id: 'bajada', label: 'Bajadas', icon: TrendingDown },
  { id: 'minimo', label: 'Mínimos', icon: Plane },
  { id: 'finde', label: 'Finde', icon: CalendarDays },
]

const PAGE = 10

export function HomeView({ onOpen, onGoSearch }) {
  const { origin, cityOf, price } = useApp()
  const [cat, setCat] = useState('all')
  const [shown, setShown] = useState(PAGE)
  const url = apiUrl('/api/deals', { origin })
  const { data: deals, loading, error, reload } = useApi(url)

  const list = deals ?? []
  const filtered = cat === 'all' ? list : list.filter((d) => d.tags.includes(cat))
  const cats = CATEGORIES.filter((c) => c.id === 'all' || list.some((d) => d.tags.includes(c.id)))
  const city = cityOf(origin)

  return (
    <div className="pb-28">
      <Header title="¿A dónde vamos?" subtitle="Hola, viajero 👋" />

      {/* Buscador rápido: lleva a la pestaña Buscar */}
      <div className="px-5">
        <button
          onClick={onGoSearch}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 pl-4 text-left shadow-sm active:scale-[0.99] dark:border-ink-600 dark:bg-ink-800"
        >
          <Search size={20} className="text-brand-500" />
          <div className="flex-1">
            <p className="text-sm font-bold">Desde {city} a cualquier sitio</p>
            <p className="text-xs text-slate-500">Fechas flexibles · ida y vuelta · precios reales</p>
          </div>
          <span className="rounded-xl bg-brand-500 px-3 py-2.5 text-xs font-bold text-white">Buscar</span>
        </button>
      </div>

      {/* Banner de estado */}
      <div className="mx-5 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500 p-4 text-white shadow-lg shadow-brand-500/25">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            {loading && !deals ? <RefreshCw size={20} className="animate-spin" /> : <Flame size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            {deals?.length ? (
              <>
                <p className="text-sm font-bold">{deals.length} destinos con precio real desde {city}</p>
                <p className="text-xs opacity-85">
                  Desde {price(deals[0].price)} ida y vuelta · {timeAgo(fetchedAt(url))}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold">{loading ? 'Buscando los vuelos más baratos…' : 'Sin datos ahora mismo'}</p>
                <p className="text-xs opacity-85">Consultando todas las rutas directas de {city}</p>
              </>
            )}
          </div>
          {deals && (
            <button onClick={reload} aria-label="Actualizar precios" className="grid h-9 w-9 place-items-center rounded-full bg-white/20 active:scale-90">
              <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
            </button>
          )}
        </div>
      </div>

      {error && !deals && (
        <EmptyState icon={WifiOff} title="No hemos podido cargar los precios" text={error.message} action="Reintentar" onAction={reload} />
      )}

      {!deals && loading && <SkeletonFeed />}

      {deals?.length > 0 && (
        <>
          {/* Carrusel: los más baratos */}
          <section className="mt-6">
            <SectionHeader title="Por menos de lo que cuesta una cena" subtitle="Ida y vuelta más baratas de los próximos 3 meses" />
            <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-5 pb-1">
              {deals.slice(0, 6).map((d) => (
                <div key={d.id} className="snap-start">
                  <DealCard deal={d} onOpen={onOpen} variant="compact" />
                </div>
              ))}
            </div>
          </section>

          {/* Chollos del día con categorías */}
          <section className="mt-7">
            <SectionHeader title="Chollos del día" subtitle="Precios reales de Ryanair · se actualizan cada hora" />
            <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-5">
              {cats.map((c) => (
                <Chip
                  key={c.id}
                  icon={c.icon}
                  active={cat === c.id}
                  onClick={() => {
                    setCat(c.id)
                    setShown(PAGE)
                  }}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
            <div key={cat} className="stagger space-y-4 px-5">
              {filtered.slice(0, shown).map((d) => (
                <DealCard key={d.id} deal={d} onOpen={onOpen} />
              ))}
              {filtered.length === 0 && <EmptyState icon={Sparkles} title="Sin chollos en esta categoría" text="Prueba con otra categoría o cambia el aeropuerto de origen." />}
            </div>
            {filtered.length > shown && (
              <div className="px-5 pt-4">
                <button onClick={() => setShown((n) => n + PAGE)} className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold active:scale-[0.99] dark:border-ink-600 dark:bg-ink-800">
                  Ver más ({filtered.length - shown})
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function SkeletonFeed() {
  return (
    <div className="mt-6 space-y-4 px-5">
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-52 w-44 shrink-0 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-ink-800" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-[1.75rem] bg-slate-200/80 dark:bg-ink-800" />
      ))}
    </div>
  )
}
