// Primitivas de UI reutilizables (botones, chips, etiquetas, hojas inferiores...)
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, Heart, Trash2, Bell, X, Info } from 'lucide-react'
import { TAGS } from '../data/mockData'
import { cx } from '../lib/format'
import { useApp } from '../context/AppContext'

const TONES = {
  rose: 'bg-rose-500/95 text-white shadow-rose-500/30',
  emerald: 'bg-emerald-500/95 text-white shadow-emerald-500/30',
  sky: 'bg-sky-500/95 text-white shadow-sky-500/30',
  amber: 'bg-amber-400 text-amber-950 shadow-amber-400/30',
  violet: 'bg-brand-500/95 text-white shadow-brand-500/30',
}

/** Etiqueta llamativa de oferta ("Error Fare", "Mínimo histórico"...). */
export function DealTag({ tag, className }) {
  const t = TAGS[tag]
  if (!t) return null
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-tight shadow-md backdrop-blur', TONES[t.tone], className)}>
      {t.label}
    </span>
  )
}

/** Chip seleccionable para filtros rápidos. */
export function Chip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all active:scale-95',
        active
          ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/25'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-ink-600 dark:bg-ink-800 dark:text-slate-200'
      )}
    >
      {Icon && <Icon size={15} strokeWidth={2.4} />}
      {children}
    </button>
  )
}

/** Control segmentado tipo iOS. */
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('flex rounded-2xl bg-slate-100 p-1 dark:bg-ink-800', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[13px] font-semibold transition-all',
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-ink-600 dark:text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          )}
        >
          {o.icon && <o.icon size={15} />}
          {o.label}
          {o.count != null && <span className="text-[11px] opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Interruptor on/off accesible. */
export function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-ink-600')}
    >
      <span className={cx('absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}

/** Botón de favorito con animación "pop". */
export function FavButton({ item, className, size = 18 }) {
  const { isFavorite, toggleFavorite } = useApp()
  const fav = isFavorite(item.id)
  return (
    <button
      aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(item)
      }}
      className={cx(
        'grid h-9 w-9 place-items-center rounded-full bg-white/85 text-slate-700 shadow-md backdrop-blur transition active:scale-90 dark:bg-ink-900/70 dark:text-white',
        className
      )}
    >
      <Heart key={String(fav)} size={size} className={cx(fav && 'animate-pop fill-rose-500 text-rose-500')} />
    </button>
  )
}

export function SectionHeader({ title, action, onAction, subtitle }) {
  return (
    <div className="mb-3 flex items-end justify-between px-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && (
        <button onClick={onAction} className="text-sm font-semibold text-brand-600 dark:text-brand-300">
          {action}
        </button>
      )}
    </div>
  )
}

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cx('rounded-3xl border border-slate-200/70 bg-white shadow-sm shadow-slate-200/50 dark:border-ink-700 dark:bg-ink-800 dark:shadow-none', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action, onAction }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center animate-fade-up">
      <div className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
        <Icon size={34} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{text}</p>
      {action && (
        <button onClick={onAction} className="mt-6 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 active:scale-95">
          {action}
        </button>
      )}
    </div>
  )
}

/**
 * Renderiza en la capa de overlays del marco de la app. Evita que las
 * animaciones (transform/opacity) de las vistas recorten o tapen los modales.
 */
export function Portal({ children }) {
  return createPortal(children, document.getElementById('overlay-root') ?? document.body)
}

/** Hoja inferior modal (bottom sheet) estilo app nativa. */
export function BottomSheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <Portal>
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[88%] flex-col rounded-t-[2rem] bg-white shadow-2xl animate-sheet-up dark:bg-ink-900">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-ink-600" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-ink-800">
            <X size={18} />
          </button>
        </div>
        <div className="no-scrollbar overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 pt-3 pb-safe dark:border-ink-700">{footer}</div>}
      </div>
    </div>
    </Portal>
  )
}

const TOAST_ICONS = { check: Check, heart: Heart, trash: Trash2, bell: Bell, info: Info }

/** Notificación flotante efímera. */
export function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  const Icon = TOAST_ICONS[toast.icon] ?? Check
  return (
    <div key={toast.id} className="pointer-events-none absolute inset-x-0 bottom-24 z-[60] flex justify-center px-6 animate-fade-up">
      <div className="flex items-center gap-2.5 rounded-2xl bg-slate-900/95 px-4 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur dark:bg-white/95 dark:text-slate-900">
        <Icon size={17} className="shrink-0 text-brand-300 dark:text-brand-600" />
        {toast.message}
      </div>
    </div>
  )
}
