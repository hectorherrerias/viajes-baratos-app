// Pantalla de inicio: buscador rápido, categorías y "Chollos del día"
import { useMemo, useState } from 'react'
import { Search, Zap, Flame, TrendingDown, Plane, Sparkles, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getDeals, ORIGINS } from '../data/mockData'
import { Header } from '../components/Navigation'
import { DealCard } from '../components/Cards'
import { Chip, SectionHeader, EmptyState } from '../components/ui'

const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: Sparkles },
  { id: 'error', label: 'Error Fare', icon: Zap },
  { id: 'minimo', label: 'Mínimo histórico', icon: TrendingDown },
  { id: 'directo', label: 'Directos', icon: Plane },
  { id: 'finde', label: 'Finde', icon: CalendarDays },
]

export function HomeView({ onOpen, onGoSearch }) {
  const { origin, price } = useApp()
  const [cat, setCat] = useState('all')
  const deals = useMemo(() => getDeals(origin), [origin])
  const filtered = cat === 'all' ? deals : deals.filter((d) => d.tags.includes(cat))
  const hot = [...deals].sort((a, b) => a.price - b.price).slice(0, 5)
  const city = ORIGINS.find((o) => o.code === origin)?.city

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
            <p className="text-xs text-slate-500">Cualquier fecha · 1 viajero · Mes más barato</p>
          </div>
          <span className="rounded-xl bg-brand-500 px-3 py-2.5 text-xs font-bold text-white">Buscar</span>
        </button>
      </div>

      {/* Banner de ahorro */}
      <div className="mx-5 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500 p-4 text-white shadow-lg shadow-brand-500/25">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Flame size={22} />
          </span>
          <div>
            <p className="text-sm font-bold">{deals.length} chollos detectados hoy</p>
            <p className="text-xs opacity-85">Desde {price(hot[0].price)} ida y vuelta · actualizado hace 4 min</p>
          </div>
        </div>
      </div>

      {/* Carrusel: los más baratos */}
      <section className="mt-6">
        <SectionHeader title="Por menos de lo que cuesta una cena" subtitle="Los precios más bajos desde tu aeropuerto" />
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-5 pb-1">
          {hot.map((d) => (
            <div key={d.id} className="snap-start">
              <DealCard deal={d} onOpen={onOpen} variant="compact" />
            </div>
          ))}
        </div>
      </section>

      {/* Chollos del día con categorías */}
      <section className="mt-7">
        <SectionHeader title="Chollos del día" subtitle="Ofertas verificadas en las últimas 24 h" />
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-5">
          {CATEGORIES.map((c) => (
            <Chip key={c.id} icon={c.icon} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div key={cat} className="stagger space-y-4 px-5">
          {filtered.map((d) => (
            <DealCard key={d.id} deal={d} onOpen={onOpen} />
          ))}
          {filtered.length === 0 && <EmptyState icon={Sparkles} title="Sin chollos en esta categoría" text="Prueba con otra categoría o cambia el aeropuerto de origen." />}
        </div>
      </section>
    </div>
  )
}
