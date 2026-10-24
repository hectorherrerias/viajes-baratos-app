import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from '../lib/useLocalStorage'
import { useApi } from '../lib/api'
import { FALLBACK_ORIGINS } from '../data/constants'
import { formatPrice } from '../lib/format'

// Estado global de la app: preferencias, favoritos, alertas y toasts.
const AppContext = createContext(null)

const DEFAULT_ALERTS = [{ id: 'al-default', origin: 'MAD', dest: 'LIS', target: 40, active: true, createdAt: '2026-10-21' }]

export function AppProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('vb:theme', 'system') // 'light' | 'dark' | 'system'
  const [currency, setCurrency] = useLocalStorage('vb:currency', 'EUR')
  const [origin, setOrigin] = useLocalStorage('vb:origin', 'MAD')
  const [favorites, setFavorites] = useLocalStorage('vb:favorites:v2', [])
  const [alerts, setAlerts] = useLocalStorage('vb:alerts:v2', DEFAULT_ALERTS)
  const [prefs, setPrefs] = useLocalStorage('vb:notif', { drops: true, errorFares: true })
  const [toast, setToast] = useState(null)

  // Datos compartidos: tipos de cambio (BCE) y aeropuertos de salida en España
  const { data: rates } = useApi('/api/rates')
  const { data: airports } = useApi('/api/airports?country=es')
  const origins = airports?.length ? airports : FALLBACK_ORIGINS

  // Aplica la clase .dark según la preferencia (y sigue al sistema si procede)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  const notify = useCallback((message, icon = 'check') => {
    const id = Date.now()
    setToast({ id, message, icon })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2600)
  }, [])

  const price = useCallback(
    (eur, opts) => formatPrice(eur, currency, { rate: rates?.[currency] ?? 1, ...opts }),
    [currency, rates]
  )

  const isFavorite = useCallback((id) => favorites.some((f) => f.id === id), [favorites])

  /** Guarda o quita un elemento (oferta, vuelo, bus...) de favoritos. */
  const toggleFavorite = useCallback(
    (item) => {
      const exists = favorites.some((f) => f.id === item.id)
      setFavorites((prev) => (exists ? prev.filter((f) => f.id !== item.id) : [{ ...item, savedAt: Date.now() }, ...prev]))
      notify(exists ? 'Eliminado de favoritos' : 'Guardado en favoritos', exists ? 'trash' : 'heart')
    },
    [favorites, setFavorites, notify]
  )

  const addAlert = useCallback(
    (alert) => {
      setAlerts((prev) => [{ id: `al-${Date.now()}`, active: true, createdAt: new Date().toISOString().slice(0, 10), ...alert }, ...prev])
      notify(`Alerta creada · te avisamos por debajo de ${price(alert.target)}`, 'bell')
    },
    [setAlerts, notify, price]
  )
  const toggleAlert = useCallback((id) => setAlerts((p) => p.map((a) => (a.id === id ? { ...a, active: !a.active } : a))), [setAlerts])
  const removeAlert = useCallback((id) => setAlerts((p) => p.filter((a) => a.id !== id)), [setAlerts])

  // El servidor vigila las alertas y avisa por Telegram: se le envía la lista de este dispositivo
  // cada vez que cambia (y al abrir la app). deviceId distingue iPhone, iPad, PC...
  const [deviceId] = useLocalStorage('vb:device', `dev-${Math.random().toString(36).slice(2, 10)}`)
  const [telegram, setTelegram] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: deviceId, alerts }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setTelegram(Boolean(d?.telegram)))
        .catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [alerts, deviceId])

  const cityOf = useCallback((code) => origins.find((o) => o.code === code)?.city ?? code, [origins])

  const value = useMemo(
    () => ({
      theme, setTheme, currency, setCurrency, origin, setOrigin, origins, cityOf, rates,
      favorites, isFavorite, toggleFavorite,
      alerts, addAlert, toggleAlert, removeAlert, telegram,
      prefs, setPrefs,
      toast, notify, price,
    }),
    [theme, setTheme, currency, setCurrency, origin, setOrigin, origins, cityOf, rates, favorites, isFavorite, toggleFavorite, alerts, addAlert, toggleAlert, removeAlert, telegram, prefs, setPrefs, toast, notify, price]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
