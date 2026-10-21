import { useEffect, useState } from 'react'

/** useState persistido en localStorage (tolerante a modo privado / errores). */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* almacenamiento no disponible: se mantiene solo en memoria */
    }
  }, [key, value])

  return [value, setValue]
}
