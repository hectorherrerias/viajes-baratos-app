// Alertas de precio: novedades reales + rutas vigiladas con su precio actual
import { useMemo, useState } from 'react'
import { Plus, Trash2, TrendingDown, Zap, BellRing, BellOff, ArrowRight, Trophy, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { apiUrl, useApi } from '../lib/api'
import { Header } from '../components/Navigation'
import { BottomSheet, Card, EmptyState, Portal, SectionHeader, Toggle } from '../components/ui'
import { cx, fmtDay } from '../lib/format'

const NOTIF_STYLE = {
  reached: { icon: Trophy, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  drop: { icon: TrendingDown, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  error: { icon: Zap, cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
}

export function AlertsView({ onOpen }) {
  const { alerts, toggleAlert, removeAlert, price, origin, cityOf, prefs, telegram } = useApp()
  const [creating, setCreating] = useState(false)

  // Precio actual real de cada ruta vigilada
  const routesParam = alerts.map((a) => `${a.origin}-${a.dest}`).join(',')
  const { data: current, loading, reload } = useApi(alerts.length ? apiUrl('/api/prices', { routes: routesParam }) : null)
  const byRoute = useMemo(() => Object.fromEntries((current ?? []).map((p) => [`${p.origin.code}-${p.code}`, p])), [current])

  // Novedades: alertas alcanzadas + bajadas y posibles error fares desde tu aeropuerto
  const { data: deals } = useApi(apiUrl('/api/deals', { origin }))
  const news = useMemo(() => {
    const list = []
    for (const a of alerts) {
      const p = byRoute[`${a.origin}-${a.dest}`]
      if (a.active && p?.price != null && p.price <= a.target)
        list.push({ id: `r-${a.id}`, kind: 'reached', item: p, title: `${cityOf(a.origin)} → ${p.city} a ${price(p.price)}`, body: `Por debajo de tu objetivo (${price(a.target)}). ${fmtDay(p.outDate)} – ${fmtDay(p.backDate)}.` })
    }
    for (const d of deals ?? []) {
      if (prefs.errorFares && d.tags.includes('error'))
        list.push({ id: `e-${d.id}`, kind: 'error', item: d, title: `Posible error fare: ${d.city}`, body: `Ida y vuelta por ${price(d.price)}${d.oldPrice ? ` (antes ${price(d.oldPrice)})` : ''}. Suele durar poco.` })
      else if (prefs.drops && d.tags.includes('bajada'))
        list.push({ id: `b-${d.id}`, kind: 'drop', item: d, title: `${d.city} ha bajado a ${price(d.price)}`, body: `${d.oldPrice ? `Antes ${price(d.oldPrice)}. ` : ''}${fmtDay(d.outDate)} – ${fmtDay(d.backDate)}.` })
    }
    return list.slice(0, 8)
  }, [alerts, byRoute, deals, prefs, price, cityOf])

  return (
    <div className="pb-28">
      <Header title="Alertas" subtitle="Te avisamos cuando bajen los precios" />

      <section>
        <SectionHeader title="Novedades" subtitle="Calculadas con precios reales" />
        <div className="stagger space-y-2 px-5">
          {news.map((n) => {
            const s = NOTIF_STYLE[n.kind]
            return (
              <Card key={n.id} role="button" onClick={() => onOpen(n.item)} className="flex gap-3 !rounded-2xl p-3 active:scale-[0.99]">
                <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', s.cls)}>
                  <s.icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </div>
              </Card>
            )
          })}
          {news.length === 0 && (
            <Card className="!rounded-2xl p-4 text-center text-xs text-slate-500">
              Sin novedades por ahora. Las bajadas se detectan comparando con los precios que la app registra cada día.
            </Card>
          )}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Rutas vigiladas" subtitle={`${alerts.filter((a) => a.active).length} activas · ida y vuelta, próximos 3 meses${telegram ? " · 📲 te aviso por Telegram" : ""}`} action="+ Nueva" onAction={() => setCreating(true)} />
        {alerts.length === 0 ? (
          <EmptyState icon={BellRing} title="Sin alertas" text="Crea una alerta y te avisaremos cuando el precio baje de tu objetivo." action="Crear alerta" onAction={() => setCreating(true)} />
        ) : (
          <div className="space-y-3 px-5">
            {alerts.map((a) => {
              const p = byRoute[`${a.origin}-${a.dest}`]
              const now = p?.price
              const reached = now != null && now <= a.target
              const progress = now ? Math.min(100, Math.round((a.target / now) * 100)) : 0
              return (
                <Card key={a.id} className={cx('p-4 transition-opacity', !a.active && 'opacity-55')}>
                  <div className="flex items-center justify-between">
                    <p className="flex min-w-0 items-center gap-1.5 font-bold">
                      <span className="truncate">{cityOf(a.origin)}</span> <ArrowRight size={15} className="shrink-0 text-slate-400" /> <span className="truncate">{p?.city ?? a.dest}</span>
                    </p>
                    <Toggle label="Activar alerta" checked={a.active} onChange={() => toggleAlert(a.id)} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <button disabled={!now} onClick={() => p && onOpen(p)} className="text-left">
                      <p className="text-[11px] text-slate-500">Precio actual</p>
                      <p className={cx('text-2xl font-extrabold', reached && 'text-emerald-600 dark:text-emerald-400', loading && !current && 'animate-pulse text-slate-300')}>
                        {now != null ? price(now) : loading ? '…' : 'Sin vuelos'}
                      </p>
                      {p?.outDate && <p className="text-[11px] text-slate-500">{fmtDay(p.outDate)} – {fmtDay(p.backDate)}</p>}
                    </button>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Tu objetivo</p>
                      <p className="text-base font-bold">{price(a.target)}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700">
                    <div className={cx('h-full rounded-full transition-all', reached ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={cx('font-semibold', reached ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
                      {now == null ? 'Ruta sin vuelos directos ahora' : reached ? '🎉 ¡Objetivo alcanzado!' : `Faltan ${price(now - a.target)}`}
                    </span>
                    <button onClick={() => removeAlert(a.id)} aria-label="Eliminar alerta" className="flex items-center gap-1 text-slate-400 hover:text-rose-500">
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </Card>
              )
            })}
            <button onClick={reload} className="flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500">
              <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} /> Actualizar precios
            </button>
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

      {creating && <NewAlertSheet onClose={() => setCreating(false)} />}
    </div>
  )
}

function NewAlertSheet({ onClose }) {
  const { origin, origins, addAlert, price } = useApp()
  const [form, setForm] = useState({ origin, dest: '', target: 40 })
  const { data: routes } = useApi(apiUrl('/api/routes', { origin: form.origin }))
  const dest = form.dest || routes?.[0]?.code
  const { data: now, loading } = useApi(dest ? apiUrl('/api/prices', { routes: `${form.origin}-${dest}` }) : null)
  const current = now?.[0]?.price

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Nueva alerta de precio"
      footer={
        <button
          disabled={!dest}
          onClick={() => {
            addAlert({ origin: form.origin, dest, target: form.target })
            onClose()
          }}
          className="w-full rounded-2xl bg-brand-500 py-3.5 font-bold text-white shadow-lg shadow-brand-500/30 active:scale-[0.98] disabled:opacity-50"
        >
          Crear alerta
        </button>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-2 gap-2">
          <Select label="Desde" value={form.origin} onChange={(v) => setForm({ ...form, origin: v, dest: '' })} options={origins.map((o) => [o.code, o.city])} />
          <Select label="Hasta" value={dest ?? ''} onChange={(v) => setForm({ ...form, dest: v })} options={(routes ?? []).map((d) => [d.code, d.city])} />
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-ink-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Precio actual (i/v más barato)</span>
            <span className="font-bold">{loading ? '…' : current != null ? price(current) : 'Sin vuelos'}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-bold">Avísame por debajo de</span>
            <span className="text-xl font-extrabold text-brand-600 dark:text-brand-300">{price(form.target, { decimals: 0 })}</span>
          </div>
          <input type="range" min={10} max={300} step={1} value={form.target} onChange={(e) => setForm({ ...form, target: +e.target.value })} className="mt-2 w-full" aria-label="Precio objetivo" />
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <BellOff size={14} /> Las alertas se comprueban al abrir la app. Puedes pausarlas o eliminarlas cuando quieras.
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
