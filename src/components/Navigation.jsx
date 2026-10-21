// Barra de navegación inferior y cabecera con selectores de moneda y origen
import { useState } from 'react'
import { House, Search, Heart, Bell, User, MapPin, ChevronDown, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ORIGINS } from '../data/mockData'
import { CURRENCIES, cx } from '../lib/format'
import { BottomSheet } from './ui'

export const TABS = [
  { id: 'home', label: 'Inicio', icon: House },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'favorites', label: 'Favoritos', icon: Heart },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'profile', label: 'Perfil', icon: User },
]

export function BottomNav({ tab, onChange }) {
  const { favorites, alerts } = useApp()
  const badges = { favorites: favorites.length, alerts: alerts.filter((a) => a.active && a.current <= a.target).length }

  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/85 pb-safe backdrop-blur-xl dark:border-ink-700 dark:bg-ink-900/85">
      <ul className="flex justify-around px-2 pt-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <li key={id} className="flex-1">
              <button
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className="group relative flex w-full flex-col items-center gap-1 py-1"
              >
                <span
                  className={cx(
                    'relative grid h-8 w-14 place-items-center rounded-full transition-all duration-300',
                    active ? 'bg-brand-500/12 text-brand-600 dark:bg-brand-400/15 dark:text-brand-300' : 'text-slate-400 group-active:scale-90'
                  )}
                >
                  <Icon size={21} strokeWidth={active ? 2.5 : 2} className={cx(active && id === 'favorites' && 'fill-current')} />
                  {badges[id] > 0 && (
                    <span className="absolute top-0 right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-ink-900">
                      {badges[id]}
                    </span>
                  )}
                </span>
                <span className={cx('text-[11px] font-semibold transition-colors', active ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400')}>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Cabecera con saludo + selectores rápidos de origen y moneda. */
export function Header({ title, subtitle }) {
  const { origin, setOrigin, currency, setCurrency } = useApp()
  const [sheet, setSheet] = useState(null) // 'origin' | 'currency' | null
  const current = ORIGINS.find((o) => o.code === origin) ?? ORIGINS[0]

  return (
    <>
      <header className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setSheet('origin')}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-sm active:scale-95 dark:border-ink-600 dark:bg-ink-800"
          >
            <MapPin size={14} className="text-brand-500" />
            {current.code}
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          <button
            onClick={() => setSheet('currency')}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-sm active:scale-95 dark:border-ink-600 dark:bg-ink-800"
          >
            {CURRENCIES[currency].symbol} {currency}
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
        </div>
        <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-tight">{title}</h1>
      </header>

      <BottomSheet open={sheet === 'origin'} onClose={() => setSheet(null)} title="¿Desde dónde sales?">
        <OptionList
          options={ORIGINS.map((o) => ({ value: o.code, label: o.city, hint: o.code }))}
          value={origin}
          onChange={(v) => {
            setOrigin(v)
            setSheet(null)
          }}
        />
      </BottomSheet>
      <BottomSheet open={sheet === 'currency'} onClose={() => setSheet(null)} title="Moneda">
        <OptionList
          options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: code, hint: c.symbol }))}
          value={currency}
          onChange={(v) => {
            setCurrency(v)
            setSheet(null)
          }}
        />
      </BottomSheet>
    </>
  )
}

export function OptionList({ options, value, onChange }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-ink-700">
      {options.map((o) => (
        <li key={o.value}>
          <button onClick={() => onChange(o.value)} className="flex w-full items-center justify-between py-3.5 text-left">
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                {o.hint}
              </span>
              <span className="font-semibold">{o.label}</span>
            </span>
            {value === o.value && <Check size={20} className="text-brand-500" />}
          </button>
        </li>
      ))}
    </ul>
  )
}
