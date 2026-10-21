// Vista de detalle de una oferta real (chollo, vuelo ida/vuelta o bus)
import { useMemo, useState } from 'react'
import {
  ChevronLeft, Share2, Plane, PlaneTakeoff, PlaneLanding, CalendarDays, Clock, Moon, TrendingDown, BellRing, ExternalLink,
  TrainFront, Timer, BadgeCheck, Scale, History, Info,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { apiUrl, useApi } from '../lib/api'
import { TAGS, TRANSPORT_TYPES } from '../data/constants'
import { Cover } from '../components/Cards'
import { BottomSheet, Card, DealTag, FavButton, Segmented } from '../components/ui'
import { PriceChart } from '../components/PriceChart'
import { cx, fmtDay, fmtWeekday, formatDuration, pctOff, timeAgo } from '../lib/format'

const RANGES = [
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
]

const toPoints = (list) => list.map((p) => ({ date: new Date(`${p.day}T00:00:00Z`), price: p.price, day: p.day }))

export function DealDetail({ item, onClose, onCompare }) {
  const { price, addAlert, alerts, notify } = useApp()
  const [range, setRange] = useState(60)
  const [booking, setBooking] = useState(false)

  const isFlight = item.type === 'deal' || item.type === 'flight'
  const o = item.origin?.code
  const d = item.code
  const { data: cal, loading: calLoading } = useApi(isFlight ? apiUrl('/api/calendar', { origin: o, dest: d, days: 90 }) : null)

  const calendar = useMemo(() => toPoints(cal?.calendar ?? []).slice(0, range), [cal, range])
  const history = useMemo(() => toPoints(cal?.history ?? []), [cal])
  const cheapest = calendar.length ? calendar.reduce((a, b) => (b.price < a.price ? b : a)) : null
  const outIndex = calendar.findIndex((p) => p.day === item.outDate)
  const outLegPrice = item.out?.price ?? item.outPrice

  const title = item.type === 'transport' ? `${item.from} → ${item.to}` : item.city
  const hasAlert = alerts.some((a) => a.dest === d && a.origin === o)
  const provider = item.type === 'transport' ? item.operator : 'Ryanair'
  const out = item.out ?? (item.type === 'flight' ? { depart: item.depart, arrive: item.arrive, duration: item.duration, price: item.outPrice, date: item.outDate, from: item.from, to: item.to } : null)
  const back = item.type === 'flight' ? { ...item.back, date: item.backDate, from: item.to, to: item.from } : item.back

  const share = async () => {
    const text = `${title} por ${price(item.price)} ${item.type === 'transport' ? 'en bus' : 'ida y vuelta'} (${fmtDay(item.outDate ?? item.date)}) ✈️ ${item.bookingUrl}`
    try {
      if (navigator.share) await navigator.share({ title: 'Chollo', text })
      else {
        await navigator.clipboard.writeText(text)
        notify('Oferta copiada al portapapeles', 'check')
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
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {item.type === 'transport' ? `${item.operator} · ${TRANSPORT_TYPES[item.kind]}` : `${item.airport ?? item.city}${item.country ? ` · ${item.country}` : ''}`}
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
                  <p className="text-[13px] leading-snug font-bold">{f.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Itinerario real */}
          {out && back && (
            <Card className="space-y-3 p-4">
              <h2 className="font-bold">Itinerario</h2>
              <LegRow icon={PlaneTakeoff} label="Ida" leg={out} />
              <div className="h-px bg-slate-100 dark:bg-ink-700" />
              <LegRow icon={PlaneLanding} label="Vuelta" leg={back} />
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Info size={12} /> Tarifa básica: solo bolso pequeño. Maleta y asiento se pagan aparte en Ryanair.
              </p>
            </Card>
          )}

          {/* Calendario de precios reales */}
          {isFlight && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Precio de la ida por día</h2>
                <span className="text-xs text-slate-500">próximos días</span>
              </div>
              <Segmented value={range} onChange={setRange} options={RANGES} className="mb-4" />
              {calendar.length >= 2 ? (
                <PriceChart data={calendar} markIndex={outIndex >= 0 ? outIndex : calendar.indexOf(cheapest)} restLabel={outIndex >= 0 ? 'Tu salida' : 'Más barato'} />
              ) : (
                <div className={cx('h-40 rounded-2xl bg-slate-100 dark:bg-ink-700', calLoading && 'animate-pulse')} />
              )}
              {cheapest && (
                <div
                  className={cx(
                    'mt-3 flex items-start gap-2.5 rounded-2xl p-3 text-sm',
                    outLegPrice != null && outLegPrice <= cheapest.price * 1.1 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
                  )}
                >
                  <TrendingDown size={18} className="mt-0.5 shrink-0" />
                  <p>
                    El día más barato para salir es el <b>{fmtWeekday(cheapest.day)}</b> por <b>{price(cheapest.price)}</b> la ida.{' '}
                    {outLegPrice != null &&
                      (outLegPrice <= cheapest.price * 1.1 ? 'Esta oferta está en el precio mínimo del periodo.' : `Esta ida cuesta ${price(outLegPrice - cheapest.price)} más.`)}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Histórico registrado por la app */}
          {isFlight && cal && (
            <Card className="p-4">
              <h2 className="mb-1 flex items-center gap-2 font-bold">
                <History size={17} className="text-brand-500" /> Histórico registrado
              </h2>
              {history.length >= 2 ? (
                <>
                  <p className="mb-3 text-xs text-slate-500">Mínimo de ida y vuelta de la ruta en cada consulta desde el {fmtDay(history[0].day)}.</p>
                  <PriceChart data={history} restLabel="Hoy" />
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  Empezamos a vigilar esta ruta hoy. Cada día guardamos su precio mínimo para detectar bajadas, mínimos y posibles error fares.
                </p>
              )}
            </Card>
          )}

          {/* Explicación de etiquetas */}
          {item.tags?.some((t) => t !== 'directo') && (
            <Card className="space-y-2 p-4">
              {item.tags
                .filter((t) => t !== 'directo')
                .map((t) => (
                  <p key={t} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <DealTag tag={t} className="shrink-0 !shadow-none" /> <span className="pt-1">{TAGS[t]?.hint}</span>
                  </p>
                ))}
            </Card>
          )}

          {isFlight && (
            <button
              onClick={() => onCompare({ origin: o, dest: d, dateMode: 'exact', out: item.outDate, back: item.backDate })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white py-3.5 text-sm font-bold text-brand-600 active:scale-[0.98] dark:border-brand-500/30 dark:bg-ink-800 dark:text-brand-300"
            >
              <Scale size={16} /> Comparar alojamiento y transporte
            </button>
          )}

          {isFlight && (
            <button
              disabled={hasAlert}
              onClick={() => addAlert({ origin: o, dest: d, target: Math.max(10, Math.floor(item.price * 0.85)) })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold shadow-sm disabled:opacity-50 dark:bg-ink-800"
            >
              <BellRing size={17} className="text-brand-500" />
              {hasAlert ? 'Ya vigilas esta ruta' : `Avisarme por debajo de ${price(Math.max(10, Math.floor(item.price * 0.85)))}`}
            </button>
          )}
        </div>
      </div>

      {/* Barra de acción fija */}
      <div className="absolute inset-x-0 bottom-0 border-t border-slate-200/70 bg-white/90 px-5 pt-3 pb-safe backdrop-blur-xl dark:border-ink-700 dark:bg-ink-900/90">
        <div className="flex items-center gap-3 pb-1">
          <div className="flex-1">
            <p className="text-xs text-slate-500">
              {item.oldPrice > item.price ? (
                <>
                  <span className="line-through">{price(item.oldPrice)}</span> <span className="font-bold text-emerald-600">-{pctOff(item.price, item.oldPrice)}%</span>
                </>
              ) : item.type === 'transport' ? (
                'Solo ida'
              ) : (
                'Ida y vuelta'
              )}
            </p>
            <p className="text-2xl leading-tight font-extrabold">
              {price(item.price)}
              <span className="text-xs font-semibold text-slate-500"> /persona</span>
            </p>
          </div>
          <FavButton item={item} className="!h-12 !w-12 !bg-slate-100 !shadow-none dark:!bg-ink-800" size={20} />
          <button onClick={() => setBooking(true)} className="rounded-2xl bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-xl shadow-brand-500/30 active:scale-95">
            Reservar
          </button>
        </div>
      </div>

      <BottomSheet open={booking} onClose={() => setBooking(false)} title="Reservar">
        <div className="space-y-4 pb-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-ink-800">
            <BadgeCheck size={22} className="shrink-0 text-emerald-500" />
            <p className="text-sm">
              Precio consultado {item.checkedAt ? timeAgo(item.checkedAt) : 'hace poco'} en <b>{provider}</b>. Reservas directamente en su web, sin comisiones. El precio final puede variar si se agotan plazas.
            </p>
          </div>
          {out && <Line icon={PlaneTakeoff} label={`Ida ${fmtDay(out.date)} ${out.depart}`} value={price(out.price)} />}
          {back && <Line icon={PlaneLanding} label={`Vuelta ${fmtDay(back.date)} ${back.depart}`} value={price(back.price)} />}
          <a
            href={item.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setBooking(false)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 font-bold text-white shadow-lg shadow-brand-500/30 active:scale-[0.98]"
          >
            Ir a {provider} <ExternalLink size={17} />
          </a>
        </div>
      </BottomSheet>
    </div>
  )
}

function LegRow({ icon: Icon, label, leg }) {
  const { price } = useApp()
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-ink-700 dark:text-slate-300">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 capitalize">
          {label} · {fmtWeekday(leg.date)}
          {leg.flight && ` · ${leg.flight}`}
        </p>
        <p className="font-bold">
          {leg.from} {leg.depart} → {leg.to} {leg.arrive}
          <span className="ml-1.5 text-xs font-medium text-slate-500">{formatDuration(leg.duration)}</span>
        </p>
      </div>
      <span className="font-extrabold">{price(leg.price)}</span>
    </div>
  )
}

function Line({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <Icon size={16} className="text-slate-400" /> {label}
      </span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

/** Datos clave a mostrar según el tipo de elemento. */
function facts(item) {
  if (item.type === 'transport') {
    return [
      { icon: CalendarDays, label: 'Fecha', value: fmtWeekday(item.date) },
      { icon: Clock, label: 'Horario', value: `${item.depart} – ${item.arrive}` },
      { icon: Timer, label: 'Duración', value: formatDuration(item.duration) },
      { icon: TrainFront, label: 'Transbordos', value: item.transfers ? item.transfers : 'Directo' },
    ]
  }
  return [
    { icon: CalendarDays, label: 'Fechas', value: `${fmtDay(item.outDate)} – ${fmtDay(item.backDate)}` },
    { icon: Moon, label: 'Estancia', value: `${item.nights} noches` },
    { icon: Clock, label: 'Duración vuelo', value: formatDuration(item.duration) },
    { icon: Plane, label: 'Vuelo directo', value: item.airline },
  ]
}
