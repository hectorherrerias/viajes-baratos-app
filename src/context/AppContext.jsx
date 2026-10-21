import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from '../lib/useLocalStorage'
import { DEFAULT_ALERTS } from '../data/mockData'
import { formatPrice } from '../lib/format'

// Estado global de la app: preferencias, favoritos, alertas y toasts.
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('vb:theme', 'system') // 'light' | 'dark' | 'system'
  const [currency, setCurrency] = useLocalStorage('vb:currency', 'EUR')
  const [origin, setOrigin] = useLocalStorage('vb:origin', 'MAD')
  const [favorites, setFavorites] = useLocalStorage('vb:favorites', [])
  const [alerts, setAlerts] = useLocalStorage('vb:alerts', DEFAULT_ALERTS)
  const [toast, setToast] = useState(null)

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
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2400)
  }, [])

  const isFavorite = useCallback((id) => favorites.some((f) => f.id === id), [favorites])

  /** Guarda o quita un elemento (oferta, vuelo, alojamiento...) de favoritos. */
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
      notify(`Alerta creada · te avisamos por debajo de ${formatPrice(alert.target, currency)}`, 'bell')
    },
    [setAlerts, notify, currency]
  )
  const toggleAlert = useCallback((id) => setAlerts((p) => p.map((a) => (a.id === id ? { ...a, active: !a.active } : a))), [setAlerts])
  const removeAlert = useCallback((id) => setAlerts((p) => p.filter((a) => a.id !== id)), [setAlerts])

  const value = useMemo(
    () => ({
      theme, setTheme, currency, setCurrency, origin, setOrigin,
      favorites, isFavorite, toggleFavorite,
      alerts, addAlert, toggleAlert, removeAlert,
      toast, notify,
      price: (eur, opts) => formatPrice(eur, currency, opts),
    }),
    [theme, setTheme, currency, setCurrency, origin, setOrigin, favorites, isFavorite, toggleFavorite, alerts, addAlert, toggleAlert, removeAlert, toast, notify]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
