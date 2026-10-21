// Tarjetas de resultados: chollos, vuelos ida/vuelta, transporte terrestre y alojamiento
import { Plane, PlaneTakeoff, PlaneLanding, TrainFront, Bus, Car, Timer, Users, ExternalLink, Repeat } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { TRANSPORT_TYPES } from '../data/constants'
import { cx, fmtDay, fmtWeekday, formatDuration, pctOff } from '../lib/format'
import { Card, DealTag, FavButton } from './ui'

/** Imagen con degradado de respaldo (si la foto no carga, queda el degradado). */
export function Cover({ src, alt, className, children }) {
  return (
    <div className={cx('relative overflow-hidden bg-gradient-to-br from-brand-400 via-brand-600 to-cyan-500', className)}>
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      {children}
    </div>
  )
}

/** Etiquetas visibles de una oferta: las más relevantes primero. */
const TAG_ORDER = ['error', 'minimo', 'bajada', 'superchollo', 'finde', 'directo']
const topTags = (tags = [], n = 3) => TAG_ORDER.filter((t) => tags.includes(t)).slice(0, n)

/** Tarjeta grande y visual de "Chollo del día" (ida y vuelta real). */
export function DealCard({ deal, onOpen, variant = 'large' }) {
  const { price } = useApp()
  const off = pctOff(deal.price, deal.oldPrice)
  const tags = topTags(deal.tags)

  if (variant === 'compact') {
    return (
      <button onClick={() => onOpen(deal)} className="w-44 shrink-0 text-left transition-transform active:scale-[0.98]">
        <Cover src={deal.image} alt={deal.city} className="h-52 rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          {tags[0] && (
            <div className="absolute top-3 left-3">
              <DealTag tag={tags[0]} />
            </div>
          )}
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="truncate text-base leading-tight font-bold">{deal.city}</p>
            <p className="text-xs opacity-85">
              {fmtDay(deal.outDate)} · {deal.nights} noches
            </p>
            <p className="mt-1 text-lg font-extrabold">{price(deal.price)}</p>
          </div>
        </Cover>
      </button>
    )
  }

  return (
    <article onClick={() => onOpen(deal)} className="cursor-pointer transition-transform active:scale-[0.99]">
      <Cover src={deal.image} alt={deal.city} className="h-64 rounded-[1.75rem] shadow-xl shadow-slate-300/40 dark:shadow-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 pr-14">
          {tags.map((t) => (
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
              {fmtDay(deal.outDate)} – {fmtDay(deal.backDate)} · {deal.nights} noches · {deal.airline}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-right backdrop-blur-md">
            {deal.oldPrice > deal.price && <p className="text-[11px] line-through opacity-70">{price(deal.oldPrice)}</p>}
            <p className="text-2xl leading-none font-extrabold">{price(deal.price)}</p>
            <p className="mt-0.5 text-[11px] font-bold text-emerald-300">{off > 0 ? `-${off}%` : 'ida y vuelta'}</p>
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
      {old > value && <p className="text-[11px] text-slate-400 line-through">{price(old)}</p>}
      <p className="text-xl leading-none font-extrabold text-slate-900 dark:text-white">{price(value)}</p>
      {unit && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{unit}</p>}
    </div>
  )
}

function Leg({ icon: Icon, date, depart, arrive, duration, from, to, price }) {
  const { price: fmt } = useApp()
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="shrink-0 text-slate-400" />
      <div className="w-16 shrink-0 text-[11px] font-semibold text-slate-500 capitalize">{fmtWeekday(date)}</div>
      <div className="flex flex-1 items-center gap-2">
        <span className="font-extrabold tabular-nums">{depart}</span>
        <span className="relative h-px flex-1 bg-slate-200 dark:bg-ink-600">
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 text-[10px] whitespace-nowrap text-slate-500 dark:bg-ink-800">{formatDuration(duration)}</span>
        </span>
        <span className="font-extrabold tabular-nums">{arrive}</span>
      </div>
      <span className="w-14 shrink-0 text-right text-xs text-slate-500">
        {from}→{to}
        <br />
        <b className="text-slate-700 dark:text-slate-200">{fmt(price)}</b>
      </span>
    </div>
  )
}

/** Opción de vuelo ida y vuelta con precio real de cada tramo. */
export function FlightCard({ flight, cheapest, onOpen }) {
  return (
    <Card className="p-4 transition-transform active:scale-[0.99]" onClick={() => onOpen(flight)} role="button">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Plane size={16} />
          </span>
          <div>
            <p className="text-sm leading-tight font-bold">{flight.airline}</p>
            <p className="text-[11px] text-slate-500">Directo · {flight.nights} noches</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {cheapest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Más barato</span>}
          {flight.exact && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">Tu fecha</span>}
          <FavButton item={flight} size={16} className="!h-8 !w-8 !bg-slate-100 !shadow-none dark:!bg-ink-700" />
        </div>
      </div>
      <div className="space-y-2.5 text-sm">
        <Leg icon={PlaneTakeoff} date={flight.outDate} depart={flight.depart} arrive={flight.arrive} duration={flight.duration} from={flight.from} to={flight.to} price={flight.outPrice} />
        <Leg icon={PlaneLanding} date={flight.backDate} depart={flight.back.depart} arrive={flight.back.arrive} duration={flight.back.duration} from={flight.to} to={flight.from} price={flight.back.price} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-ink-700">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Repeat size={13} /> Ida y vuelta por persona
        </span>
        <PriceBlock value={flight.price} />
      </div>
    </Card>
  )
}

const TRANSPORT_ICONS = { train: TrainFront, bus: Bus, carpool: Car }

/** Bus o tren real (FlixBus). */
export function TransportCard({ item, flightPrice, onOpen }) {
  const Icon = TRANSPORT_ICONS[item.kind] ?? Bus
  const saving = flightPrice ? Math.round(flightPrice / 2 - item.price) : null
  return (
    <Card className="p-4 transition-transform active:scale-[0.99]" onClick={() => onOpen(item)} role="button">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {item.depart} → {item.arrive}
          </p>
          <p className="truncate text-xs text-slate-500">
            {item.operator} · {TRANSPORT_TYPES[item.kind]} · {fmtWeekday(item.date)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Timer size={12} /> {formatDuration(item.duration)}
            </span>
            <span className={cx(item.transfers ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400')}>
              {item.transfers ? `${item.transfers} transbordo${item.transfers > 1 ? 's' : ''}` : 'Directo'}
            </span>
            {item.seats != null && item.seats < 10 && (
              <span className="flex items-center gap-1 text-rose-500">
                <Users size={12} /> Quedan {item.seats}
              </span>
            )}
            {saving > 0 && <span className="text-emerald-600 dark:text-emerald-400">Ahorras {saving} € vs avión</span>}
          </div>
        </div>
        <PriceBlock value={item.price} unit="solo ida" />
      </div>
    </Card>
  )
}

/** Enlace a un proveedor de alojamiento con los filtros aplicados. */
export function StayProviderCard({ provider }) {
  const LOGOS = { booking: 'bg-[#003580] text-white', hostelworld: 'bg-[#f25621] text-white', airbnb: 'bg-[#ff385c] text-white' }
  return (
    <a href={provider.url} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="flex items-center gap-3 p-4 transition-transform active:scale-[0.99]">
        <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-extrabold', LOGOS[provider.id])}>{provider.name[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{provider.name}</p>
          <p className="text-xs text-slate-500">{provider.note}</p>
        </div>
        <ExternalLink size={18} className="shrink-0 text-slate-400" />
      </Card>
    </a>
  )
}
