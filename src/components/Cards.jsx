// Tarjetas de resultados: chollos, vuelos, alojamientos y transporte
import { Plane, Star, MapPin, ShieldCheck, Coffee, Luggage, TrainFront, Bus, Car, Leaf, Timer, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { STAY_TYPES, TRANSPORT_TYPES } from '../data/mockData'
import { cx, formatDuration, pctOff } from '../lib/format'
import { Card, DealTag, FavButton } from './ui'

/** Imagen con degradado de respaldo (si la foto no carga, queda el degradado). */
export function Cover({ src, alt, className, children }) {
  return (
    <div className={cx('relative overflow-hidden bg-gradient-to-br from-brand-400 via-brand-600 to-cyan-500', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      {children}
    </div>
  )
}

/** Tarjeta grande y visual de "Chollo del día". */
export function DealCard({ deal, onOpen, variant = 'large' }) {
  const { price } = useApp()
  const off = pctOff(deal.price, deal.oldPrice)

  if (variant === 'compact') {
    return (
      <button onClick={() => onOpen(deal)} className="w-44 shrink-0 text-left active:scale-[0.98] transition-transform">
        <Cover src={deal.image} alt={deal.city} className="h-52 rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute top-3 left-3">
            <DealTag tag={deal.tags[0]} />
          </div>
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="text-base font-bold leading-tight">{deal.city}</p>
            <p className="text-xs opacity-80">{deal.outDate} · {deal.nights} noches</p>
            <p className="mt-1 text-lg font-extrabold">{price(deal.price)}</p>
          </div>
        </Cover>
      </button>
    )
  }

  return (
    <article onClick={() => onOpen(deal)} className="cursor-pointer active:scale-[0.99] transition-transform">
      <Cover src={deal.image} alt={deal.city} className="h-64 rounded-[1.75rem] shadow-xl shadow-slate-300/40 dark:shadow-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 pr-14">
          {deal.tags.map((t) => (
            <DealTag key={t} tag={t} />
          ))}
        </div>
        <FavButton item={deal} className="absolute top-4 right-4" />
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs font-medium opacity-85">
              <Plane size={13} /> {deal.origin.city} → {deal.country}
            </p>
            <h3 className="truncate text-2xl font-extrabold tracking-tight">{deal.city}</h3>
            <p className="text-xs opacity-85">
              {deal.outDate} – {deal.backDate} · {deal.stops === 0 ? 'Directo' : '1 escala'} · {deal.airline}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-right backdrop-blur-md">
            <p className="text-[11px] line-through opacity-70">{price(deal.oldPrice)}</p>
            <p className="text-2xl leading-none font-extrabold">{price(deal.price)}</p>
            <p className="mt-0.5 text-[11px] font-bold text-emerald-300">-{off}%</p>
          </div>
        </div>
      </Cover>
    </article>
  )
}

function PriceBlock({ value, old, unit }) {
  const { price } = useApp()
  return (
    <div className="text-right">
      {old && <p className="text-[11px] text-slate-400 line-through">{price(old)}</p>}
      <p className="text-xl leading-none font-extrabold text-slate-900 dark:text-white">{price(value)}</p>
      {unit && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{unit}</p>}
    </div>
  )
}

/** Resultado de vuelo. */
export function FlightCard({ flight, cheapest, onOpen }) {
  return (
    <Card className="p-4 active:scale-[0.99] transition-transform" onClick={() => onOpen(flight)} role="button">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Plane size={16} />
          </span>
          <span className="text-sm font-bold">{flight.airline}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {cheapest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Más barato</span>}
          {flight.tags.includes('error') && <DealTag tag="error" className="!py-0.5 !shadow-none" />}
          <FavButton item={flight} size={16} className="!h-8 !w-8 !bg-slate-100 !shadow-none dark:!bg-ink-700" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <p className="text-lg font-extrabold">{flight.depart}</p>
          <p className="text-xs font-semibold text-slate-500">{flight.from}</p>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <p className="text-[11px] text-slate-500">{formatDuration(flight.duration)}</p>
          <div className="relative my-1 h-px w-full bg-slate-200 dark:bg-ink-600">
            {flight.stops > 0 && <span className="absolute top-1/2 left-1/2 h-2 w-2 -translate-1/2 rounded-full bg-amber-400" />}
          </div>
          <p className={cx('text-[11px] font-semibold', flight.stops ? 'text-amber-600' : 'text-emerald-600')}>
            {flight.stops ? '1 escala' : 'Directo'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold">{flight.arrive}</p>
          <p className="text-xs font-semibold text-slate-500">{flight.to}</p>
        </div>
        <div className="ml-2 border-l border-slate-100 pl-3 dark:border-ink-700">
          <PriceBlock value={flight.price} unit="por persona" />
        </div>
      </div>
      {flight.bag && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Luggage size={13} /> Maleta de cabina incluida
        </p>
      )}
    </Card>
  )
}

/** Resultado de alojamiento. */
export function StayCard({ stay, nights, onOpen }) {
  const { price } = useApp()
  return (
    <Card className="flex gap-3 overflow-hidden p-2.5 active:scale-[0.99] transition-transform" onClick={() => onOpen(stay)} role="button">
      <Cover src={stay.image} alt={stay.name} className="h-32 w-28 shrink-0 rounded-2xl">
        <span className="absolute bottom-2 left-2 rounded-lg bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          {STAY_TYPES[stay.kind]}
        </span>
      </Cover>
      <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-sm leading-snug font-bold">{stay.name}</h4>
          <FavButton item={stay} size={15} className="!h-8 !w-8 shrink-0 !bg-slate-100 !shadow-none dark:!bg-ink-700" />
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          <span className="rounded-md bg-brand-500 px-1.5 py-0.5 font-bold text-white">{stay.rating.toFixed(1)}</span>
          <span className="text-slate-500">{stay.reviews.toLocaleString('es-ES')} opiniones</span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={12} /> {stay.distance} km del centro
        </p>
        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col gap-0.5 text-[11px] font-semibold">
            {stay.freeCancel && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={12} /> Cancelación gratis
              </span>
            )}
            {stay.breakfast && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Coffee size={12} /> Desayuno
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg leading-none font-extrabold">{price(stay.price)}</p>
            <p className="text-[10px] text-slate-500">noche · {price(stay.price * nights)} total</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

const TRANSPORT_ICONS = { train: TrainFront, bus: Bus, carpool: Car }

/** Resultado de transporte alternativo (tren, bus, coche compartido). */
export function TransportCard({ item, flightCo2, onOpen }) {
  const Icon = TRANSPORT_ICONS[item.kind]
  const saving = Math.max(0, Math.round((1 - item.co2 / flightCo2) * 100))
  return (
    <Card className="p-4 active:scale-[0.99] transition-transform" onClick={() => onOpen(item)} role="button">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{item.operator}</p>
          <p className="text-xs text-slate-500">
            {TRANSPORT_TYPES[item.kind]} · {item.from} → {item.to}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Timer size={12} /> {formatDuration(item.duration)}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Leaf size={12} /> -{saving}% CO₂ vs avión
            </span>
            {item.kind === 'carpool' && (
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Users size={12} /> 3 plazas
              </span>
            )}
          </div>
        </div>
        <PriceBlock value={item.price} old={item.oldPrice} unit="por persona" />
      </div>
    </Card>
  )
}

/** Valoración en estrellas compacta. */
export function Rating({ value }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold">
      <Star size={13} className="fill-amber-400 text-amber-400" /> {value}
    </span>
  )
}

