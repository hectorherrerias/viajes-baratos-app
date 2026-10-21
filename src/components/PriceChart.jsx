// Gráfico de precios en SVG puro (sin librerías), interactivo:
// arrastra o pasa el dedo por encima para ver el precio de cada día.
// data: [{ date: Date, price: number }]; markIndex: punto destacado (p. ej. tu fecha)
import { useId, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

const W = 340
const H = 150
const PAD = { t: 16, r: 8, b: 22, l: 8 }

export function PriceChart({ data, markIndex, restLabel = 'Hoy' }) {
  const { price } = useApp()
  const gradId = useId()
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  const { path, area, pts, min, max, avg, minIdx } = useMemo(() => {
    const prices = data.map((d) => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    const span = max - min || 1
    const x = (i) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r)
    const y = (v) => PAD.t + (1 - (v - min) / span) * (H - PAD.t - PAD.b)
    const pts = data.map((d, i) => ({ x: x(i), y: y(d.price), ...d }))
    // Curva suavizada con segmentos cuadráticos por puntos medios
    let path = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]
      const c = pts[i]
      path += ` Q ${p.x} ${p.y} ${(p.x + c.x) / 2} ${(p.y + c.y) / 2}`
    }
    path += ` T ${pts.at(-1).x} ${pts.at(-1).y}`
    const area = `${path} L ${pts.at(-1).x} ${H - PAD.b} L ${pts[0].x} ${H - PAD.b} Z`
    return { path, area, pts, min, max, avg: { v: avg, y: y(avg) }, minIdx: prices.indexOf(min) }
  }, [data])

  const handleMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((rel - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  const rest = markIndex != null && pts[markIndex] ? markIndex : pts.length - 1
  const active = hover != null ? pts[hover] : pts[rest]
  const fmtDate = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' })

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <p className="text-2xl font-extrabold">{price(active.price)}</p>
          <p className="text-xs text-slate-500">{hover != null ? fmtDate(active.date) : `${restLabel} · ${fmtDate(active.date)}`}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>
            Mín <span className="font-bold text-emerald-600 dark:text-emerald-400">{price(min)}</span> · Máx{' '}
            <span className="font-bold text-rose-500">{price(max)}</span>
          </p>
          <p>Media {price(avg.v)}</p>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onPointerMove={handleMove}
        onPointerDown={handleMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Precios: mínimo ${price(min)}, máximo ${price(max)}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Línea de precio medio */}
        <line x1={PAD.l} x2={W - PAD.r} y1={avg.y} y2={avg.y} className="stroke-slate-300 dark:stroke-ink-600" strokeDasharray="4 4" />
        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke="var(--color-brand-500)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Mínimo histórico del periodo */}
        <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r="4" className="fill-emerald-500 stroke-white dark:stroke-ink-800" strokeWidth="2" />
        {/* Cursor */}
        <line x1={active.x} x2={active.x} y1={PAD.t - 6} y2={H - PAD.b} className="stroke-slate-400/60" strokeWidth="1" />
        <circle cx={active.x} cy={active.y} r="6" fill="var(--color-brand-500)" className="stroke-white dark:stroke-ink-800" strokeWidth="3" />
        {/* Eje X: primera, media y última fecha */}
        {[0, Math.floor(pts.length / 2), pts.length - 1].map((i, k) => (
          <text key={i} x={pts[i].x} y={H - 4} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} className="fill-slate-400 text-[10px]">
            {fmtDate(pts[i].date)}
          </text>
        ))}
      </svg>
    </div>
  )
}
