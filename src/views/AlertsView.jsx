// Alertas de precio: notificaciones recientes + rutas vigiladas
import { useState } from 'react'
import { Plus, Trash2, TrendingDown, TrendingUp, Zap, BellRing, BellOff, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DESTINATIONS, NOTIFICATIONS, ORIGINS, findDestination, searchTrips } from '../data/mockData'
import { Header } from '../components/Navigation'
import { BottomSheet, Card, EmptyState, Portal, SectionHeader, Toggle } from '../components/ui'
import { cx } from '../lib/format'

const NOTIF_STYLE = {
  drop: { icon: TrendingDown, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  error: { icon: Zap, cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  up: { icon: TrendingUp, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
}

export function AlertsView() {
  const { alerts, toggleAlert, removeAlert, price } = useApp()
  const [creating, setCreating] = useState(false)
  const cityOf = (code) => ORIGINS.find((o) => o.code === code)?.city ?? findDestination(code)?.city ?? code

  return (
    <div className="pb-28">
      <Header title="Alertas" subtitle="Te avisamos cuando bajen los precios" />

      <section>
        <SectionHeader title="Novedades" />
        <div className="stagger space-y-2 px-5">
          {NOTIFICATIONS.map((n) => {
            const s = NOTIF_STYLE[n.kind]
            return (
              <Card key={n.id} className="flex gap-3 !rounded-2xl p-3">
                <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.cls)}>
                  <s.icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-bold">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">{n.ago}</span>
                  </div>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Rutas vigiladas" subtitle={`${alerts.filter((a) => a.active).length} activas`} action="+ Nueva" onAction={() => setCreating(true)} />
        {alerts.length === 0 ? (
          <EmptyState icon={BellRing} title="Sin alertas" text="Crea una alerta y te avisaremos cuando el precio baje de tu objetivo." action="Crear alerta" onAction={() => setCreating(true)} />
        ) : (
          <div className="space-y-3 px-5">
            {alerts.map((a) => {
              const reached = a.current <= a.target
              const progress = Math.min(100, Math.round((a.target / a.current) * 100))
              return (
                <Card key={a.id} className={cx('p-4 transition-opacity', !a.active && 'opacity-55')}>
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 font-bold">
                      {cityOf(a.origin)} <ArrowRight size={15} className="text-slate-400" /> {cityOf(a.dest)}
                    </p>
                    <Toggle label="Activar alerta" checked={a.active} onChange={() => toggleAlert(a.id)} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500">Precio actual</p>
                      <p className={cx('text-2xl font-extrabold', reached ? 'text-emerald-600 dark:text-emerald-400' : '')}>{price(a.current)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Tu objetivo</p>
                      <p className="text-base font-bold">{price(a.target)}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700">
                    <div className={cx('h-full rounded-full', reached ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={cx('font-semibold', reached ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
                      {reached ? '🎉 ¡Objetivo alcanzado!' : `Faltan ${price(a.current - a.target)}`}
                    </span>
                    <button onClick={() => removeAlert(a.id)} aria-label="Eliminar alerta" className="flex items-center gap-1 text-slate-400 hover:text-rose-500">
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <Portal>
        <button
          onClick={() => setCreating(true)}
          aria-label="Nueva alerta"
          className="pointer-events-auto absolute right-5 bottom-24 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white shadow-xl shadow-brand-500/40 active:scale-90"
        >
          <Plus size={26} />
        </button>
      </Portal>

      <NewAlertSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function NewAlertSheet({ open, onClose }) {
  const { origin, addAlert, price } = useApp()
  const [form, setForm] = useState({ origin, dest: 'LIS', target: 30 })
  const current = Math.min(...searchTrips({ origin: form.origin, dest: form.dest, flex: 'any' }).flights.map((f) => f.price))

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Nueva alerta de precio"
      footer={
        <button
          onClick={() => {
            addAlert({ ...form, current })
            onClose()
          }}
          className="w-full rounded-2xl bg-brand-500 py-3.5 font-bold text-white shadow-lg shadow-brand-500/30 active:scale-[0.98]"
        >
          Crear alerta
        </button>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-2 gap-2">
          <Select label="Desde" value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} options={ORIGINS.map((o) => [o.code, o.city])} />
          <Select label="Hasta" value={form.dest} onChange={(v) => setForm({ ...form, dest: v })} options={DESTINATIONS.map((d) => [d.code, d.city])} />
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-ink-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Precio actual</span>
            <span className="font-bold">{price(current)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-bold">Avísame por debajo de</span>
            <span className="text-xl font-extrabold text-brand-600 dark:text-brand-300">{price(form.target)}</span>
          </div>
          <input type="range" min={10} max={150} step={1} value={form.target} onChange={(e) => setForm({ ...form, target: +e.target.value })} className="mt-2 w-full" aria-label="Precio objetivo" />
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <BellOff size={14} /> Puedes pausar o eliminar la alerta cuando quieras.
        </p>
      </div>
    </BottomSheet>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-ink-800">
      <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent font-bold outline-none dark:[color-scheme:dark]">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
