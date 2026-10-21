// Favoritos guardados, filtrables por tipo
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Header } from '../components/Navigation'
import { DealCard, FlightCard, TransportCard } from '../components/Cards'
import { EmptyState, Segmented } from '../components/ui'

export function FavoritesView({ onOpen, onExplore }) {
  const { favorites, price } = useApp()
  const [type, setType] = useState('all')
  const count = (t) => favorites.filter((f) => f.type === t).length
  const list = type === 'all' ? favorites : favorites.filter((f) => f.type === type)
  const cheapest = favorites.length ? Math.min(...favorites.map((f) => f.price)) : 0

  return (
    <div className="pb-28">
      <Header title="Favoritos" subtitle={favorites.length ? `${favorites.length} ${favorites.length === 1 ? "guardado" : "guardados"} · desde ${price(cheapest)}` : 'Tus planes guardados'} />
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aún no tienes favoritos"
          text="Toca el corazón en cualquier chollo, vuelo o bus para guardarlo aquí y comparar más tarde."
          action="Explorar chollos"
          onAction={onExplore}
        />
      ) : (
        <>
          <div className="px-5">
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: 'all', label: 'Todo' },
                { value: 'deal', label: 'Chollos', count: count('deal') },
                { value: 'flight', label: 'Vuelos', count: count('flight') },
                { value: 'transport', label: 'Buses', count: count('transport') },
              ]}
            />
          </div>
          <p className="mt-3 px-5 text-[11px] text-slate-500">Precios del momento en que guardaste cada oferta. Ábrela para ver el precio actualizado.</p>
          <div key={type} className="stagger mt-3 space-y-3 px-5">
            {list.map((f) =>
              f.type === 'deal' ? (
                <DealCard key={f.id} deal={f} onOpen={onOpen} />
              ) : f.type === 'flight' ? (
                <FlightCard key={f.id} flight={f} onOpen={onOpen} />
              ) : (
                <TransportCard key={f.id} item={f} onOpen={onOpen} />
              )
            )}
            {list.length === 0 && <EmptyState icon={Heart} title="Nada por aquí" text="No has guardado nada de este tipo todavía." />}
          </div>
        </>
      )}
    </div>
  )
}
