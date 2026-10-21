// Vista de detalle de una oferta (chollo, vuelo, alojamiento o transporte)
import { useMemo, useState } from 'react'
import {
  ChevronLeft, Share2, Plane, CalendarDays, Clock, Users, TrendingDown, BellRing, BedDouble, ExternalLink,
  ShieldCheck, MapPin, Star, Leaf, TrainFront, Timer, BadgeCheck, Scale,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getPriceHistory, STAY_TYPES, TRANSPORT_TYPES } from '../data/mockData'
import { Cover } from '../components/Cards'
import { BottomSheet, Card, DealTag, FavButton, Segmented } from '../components/ui'
import { PriceChart } from '../components/PriceChart'
import { cx, formatDuration, pctOff } from '../lib/format'

const RANGES = [
  { value: 30, label: '30 días' },
  { value: 90, label: '3 meses' },
  { value: 180, label: '6 meses' },
]

export function DealDetail({ item, onClose, onCompare }) {
  const { price, addAlert, alerts, notify } = useApp()
  const [range, setRange] = useState(90)
  const [booking, setBooking] = useState(false)

  const oldPrice = item.oldPrice ?? Math.round(item.price * 1.4)
  const history = useMemo(() => getPriceHistory(item.id, item.price, oldPrice, range), [item.id, item.price, oldPrice, range])
  const avg = history.reduce((a, b) => a + b.price, 0) / history.length
  const belowAvg = Math.round((1 - item.price / avg) * 100)
  const isMin = item.price <= Math.min(...history.map((h) => h.price))

  const title = item.type === 'stay' ? item.name : item.type === 'transport' ? `${item.from} → ${item.to}` : item.city
  const destCode = item.code ?? item.to
  const routeOrigin = item.origin?.code ?? item.from
  const canAlert = item.type === 'deal' || item.type === 'flight'
  const hasAlert = alerts.some((a) => a.dest === destCode && a.origin === routeOrigin)
  const provider = item.airline ?? item.operator ?? (item.type === 'stay' ? 'Booking' : 'Proveedor')

  const share = async () => {
    const text = `${title} por ${price(item.price)} en Chollo ✈️`
    try {
      if (navigator.share) await navigator.share({ title: 'Chollo', text, url: location.href })
      else {
        await navigator.clipboard.writeText(text)
        notify('Enlace copiado al portapapeles', 'check')
      }
    } catch {
      /* el usuario canceló */
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-canvas animate-slide-in dark:bg-ink-900">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-32">
        {/* Hero */}
        <Cover src={item.image} alt={title} className="h-80">
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-black/30 dark:from-ink-900" />
          <div className="pt-safe absolute inset-x-0 top-0 flex justify-between p-4">
            <button onClick={onClose} aria-label="Volver" className="grid h-10 w-10 place-items-center rounded-full bg-white/85 shadow-md backdrop-blur active:scale-90 dark:bg-ink-900/70">
              <ChevronLeft size={21} />
            </button>
            <div className="flex gap-2">
              <button onClick={share} aria-label="Compartir" className="grid h-10 w-10 place-items-center rounded-full bg-white/85 shadow-md backdrop-blur active:scale-90 dark:bg-ink-900/70">
                <Share2 size={18} />
              </button>
              <FavButton item={item} className="!h-10 !w-10" />
            </div>
          </div>
        </Cover>

        <div className="relative -mt-16 space-y-4 px-5">
          {/* Título y etiquetas */}
          <div className="animate-fade-up">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(item.tags ?? []).map((t) => (
                <DealTag key={t} tag={t} />
              ))}
              {isMin && !item.tags?.includes('minimo') && <DealTag tag="minimo" />}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <MapPin size={14} /> {item.country}
              {item.type === 'stay' && ` · ${STAY_TYPES[item.kind]} · ${item.distance} km del centro`}
            </p>
          </div>

          {/* Datos clave */}
          <div className="grid grid-cols-2 gap-2.5">
            {facts(item).map((f) => (
              <Card key={f.label} className="flex items-center gap-3 !rounded-2xl p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <f.icon size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">{f.label}</p>
                  <p className="truncate text-sm font-bold">{f.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Evolución de precios */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Evolución del precio</h2>
              <span className="text-xs text-slate-500">{item.type === 'stay' ? 'por noche' : 'por persona'}</span>
            </div>
            <Segmented value={range} onChange={setRange} options={RANGES} className="mb-4" />
            <PriceChart data={history} />
            <div
              className={cx(
                'mt-3 flex items-start gap-2.5 rounded-2xl p-3 text-sm',
                belowAvg > 0 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
              )}
            >
              <TrendingDown size={18} className="mt-0.5 shrink-0" />
              <p>
                {belowAvg > 0 ? (
                  <>
                    <b>{belowAvg}% por debajo</b> de la media de los últimos {RANGES.find((r) => r.value === range).label}.{' '}
                    {isMin ? 'Es el precio más bajo registrado: buen momento para reservar.' : 'Buen precio, aunque podría bajar algo más.'}
                  </>
                ) : (
                  <>Precio por encima de la media. Te recomendamos crear una alerta y esperar.</>
                )}
              </p>
            </div>
          </Card>

          {/* Desglose del paquete para chollos */}
          {item.type === 'deal' && (
            <Card className="p-4">
              <h2 className="mb-3 font-bold">Presupuesto estimado</h2>
              <Line icon={Plane} label={`Vuelo i/v · ${item.airline}`} value={price(item.price)} />
              <Line icon={BedDouble} label={`${item.nights} noches en hostal/apartamento`} value={price(item.stayPerNight * item.nights)} />
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3 dark:border-ink-600">
                <span className="font-bold">Total por persona</span>
                <span className="text-xl font-extrabold">{price(item.price + item.stayPerNight * item.nights)}</span>
              </div>
              <button
                onClick={() => onCompare({ origin: item.origin.code, dest: item.code, dateMode: 'flex', flexOpt: 'any', nights: item.nights })}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 py-3 text-sm font-bold text-brand-600 active:scale-[0.98] dark:border-brand-500/30 dark:text-brand-300"
              >
                <Scale size={16} /> Comparar alojamiento y transporte
              </button>
            </Card>
          )}

          <button
            disabled={hasAlert || !canAlert}
            onClick={() => addAlert({ origin: routeOrigin, dest: destCode, target: Math.round(item.price * 0.9), current: item.price })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold shadow-sm disabled:opacity-50 dark:bg-ink-800"
          >
            <BellRing size={17} className="text-brand-500" />
            {hasAlert ? 'Ya vigilas esta ruta' : !canAlert ? 'Alertas disponibles para vuelos' : 'Avisarme si baja de precio'}
          </button>
        </div>
      </div>

      {/* Barra de acción fija */}
      <div className="absolute inset-x-0 bottom-0 border-t border-slate-200/70 bg-white/90 px-5 pt-3 pb-safe backdrop-blur-xl dark:border-ink-700 dark:bg-ink-900/90">
        <div className="flex items-center gap-3 pb-1">
          <div className="flex-1">
            <p className="text-xs text-slate-500">
              <span className="line-through">{price(oldPrice)}</span>{' '}
              <span className="font-bold text-emerald-600">-{pctOff(item.price, oldPrice)}%</span>
            </p>
            <p className="text-2xl leading-tight font-extrabold">
              {price(item.price)}
              <span className="text-xs font-semibold text-slate-500"> {item.type === 'stay' ? '/noche' : '/persona'}</span>
            </p>
          </div>
          <FavButton item={item} className="!h-12 !w-12 !bg-slate-100 !shadow-none dark:!bg-ink-800" size={20} />
          <button
            onClick={() => setBooking(true)}
            className="rounded-2xl bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-xl shadow-brand-500/30 active:scale-95"
          >
            Reservar
          </button>
        </div>
      </div>

      <BottomSheet open={booking} onClose={() => setBooking(false)} title="Reservar">
        <div className="space-y-4 pb-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-ink-800">
            <BadgeCheck size={22} className="text-emerald-500" />
            <p className="text-sm">
              Precio verificado hace 3 minutos en <b>{provider}</b>. Te redirigimos a su web para completar la reserva sin comisiones.
            </p>
          </div>
          <Line icon={Users} label="Precio por persona" value={price(item.price)} />
          {item.seatsLeft && <Line icon={Clock} label="Plazas a este precio" value={`Quedan ${item.seatsLeft}`} />}
          <button
            onClick={() => {
              setBooking(false)
              notify(`Abriendo ${provider}… (demo)`, 'info')
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 font-bold text-white shadow-lg shadow-brand-500/30 active:scale-[0.98]"
          >
            Ir a {provider} <ExternalLink size={17} />
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

function Line({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <Icon size={16} className="text-slate-400" /> {label}
      </span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

/** Datos clave a mostrar según el tipo de elemento. */
function facts(item) {
  switch (item.type) {
    case 'deal':
      return [
        { icon: CalendarDays, label: 'Fechas', value: `${item.outDate} – ${item.backDate}` },
        { icon: Plane, label: 'Vuelo', value: item.stops ? '1 escala' : 'Directo' },
        { icon: Clock, label: 'Duración', value: formatDuration(item.duration) },
        { icon: Users, label: 'Plazas', value: `Quedan ${item.seatsLeft}` },
      ]
    case 'flight':
      return [
        { icon: Plane, label: 'Aerolínea', value: item.airline },
        { icon: Clock, label: 'Horario', value: `${item.depart} – ${item.arrive}` },
        { icon: Timer, label: 'Duración', value: formatDuration(item.duration) },
        { icon: BadgeCheck, label: 'Escalas', value: item.stops ? '1 escala' : 'Directo' },
      ]
    case 'stay':
      return [
        { icon: Star, label: 'Valoración', value: `${item.rating} · ${item.reviews} opiniones` },
        { icon: BedDouble, label: 'Tipo', value: STAY_TYPES[item.kind] },
        { icon: ShieldCheck, label: 'Cancelación', value: item.freeCancel ? 'Gratuita' : 'No reembolsable' },
        { icon: MapPin, label: 'Distancia', value: `${item.distance} km al centro` },
      ]
    case 'transport':
      return [
        { icon: TrainFront, label: 'Tipo', value: TRANSPORT_TYPES[item.kind] },
        { icon: BadgeCheck, label: 'Operador', value: item.operator },
        { icon: Timer, label: 'Duración', value: formatDuration(item.duration) },
        { icon: Leaf, label: 'Emisiones', value: `${item.co2} kg CO₂` },
      ]
    default:
      return []
  }
}
