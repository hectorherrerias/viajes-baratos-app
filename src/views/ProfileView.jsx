// Perfil y preferencias: tema, moneda, origen, notificaciones e instalación PWA
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor, Wallet, MapPin, Bell, Zap, Mail, Smartphone, PiggyBank, Heart, BellRing, ChevronRight, Download, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ORIGINS } from '../data/mockData'
import { CURRENCIES } from '../lib/format'
import { useLocalStorage } from '../lib/useLocalStorage'
import { Header, OptionList } from '../components/Navigation'
import { BottomSheet, Card, Segmented, Toggle } from '../components/ui'

export function ProfileView() {
  const { theme, setTheme, currency, setCurrency, origin, setOrigin, favorites, alerts, price } = useApp()
  const [prefs, setPrefs] = useLocalStorage('vb:notif', { push: true, errorFares: true, email: false })
  const [sheet, setSheet] = useState(null)
  const [installEvt, setInstallEvt] = useState(null)
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches)

  // Captura el evento de instalación de la PWA (Chrome/Edge/Android)
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setInstallEvt(e)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const saved = favorites.reduce((acc, f) => acc + Math.max(0, (f.oldPrice ?? f.price) - f.price), 0)
  const originCity = ORIGINS.find((o) => o.code === origin)?.city

  return (
    <div className="pb-28">
      <Header title="Perfil" subtitle="Tu cuenta" />

      <div className="space-y-5 px-5">
        {/* Tarjeta de usuario */}
        <Card className="flex items-center gap-4 p-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-2xl font-extrabold text-white">V</div>
          <div className="flex-1">
            <p className="text-lg font-bold">Viajero low-cost</p>
            <p className="text-xs text-slate-500">Miembro desde 2026 · Nivel Mochilero</p>
          </div>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-2.5">
          <Stat icon={PiggyBank} value={price(saved)} label="Ahorro potencial" />
          <Stat icon={Heart} value={favorites.length} label="Favoritos" />
          <Stat icon={BellRing} value={alerts.filter((a) => a.active).length} label="Alertas" />
        </div>

        {/* Apariencia */}
        <Group title="Apariencia">
          <div className="p-4">
            <Segmented
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: 'Claro', icon: Sun },
                { value: 'dark', label: 'Oscuro', icon: Moon },
                { value: 'system', label: 'Sistema', icon: Monitor },
              ]}
            />
          </div>
        </Group>

        {/* Preferencias */}
        <Group title="Preferencias">
          <Row icon={Wallet} label="Moneda" value={`${CURRENCIES[currency].symbol} ${currency}`} onClick={() => setSheet('currency')} />
          <Row icon={MapPin} label="Aeropuerto de origen" value={originCity} onClick={() => setSheet('origin')} />
        </Group>

        {/* Notificaciones */}
        <Group title="Notificaciones">
          <Row icon={Bell} label="Notificaciones push">
            <Toggle label="Notificaciones push" checked={prefs.push} onChange={(v) => setPrefs({ ...prefs, push: v })} />
          </Row>
          <Row icon={Zap} label="Avisos de Error Fares">
            <Toggle label="Avisos de Error Fares" checked={prefs.errorFares} onChange={(v) => setPrefs({ ...prefs, errorFares: v })} />
          </Row>
          <Row icon={Mail} label="Resumen semanal por email">
            <Toggle label="Resumen semanal" checked={prefs.email} onChange={(v) => setPrefs({ ...prefs, email: v })} />
          </Row>
        </Group>

        {/* Instalación PWA */}
        <Group title="Aplicación">
          <Row
            icon={installed ? Check : installEvt ? Download : Smartphone}
            label={installed ? 'App instalada' : 'Instalar en el móvil'}
            value={installed ? '' : installEvt ? 'Instalar' : 'Menú › Añadir a inicio'}
            onClick={
              installEvt
                ? async () => {
                    installEvt.prompt()
                    await installEvt.userChoice
                    setInstallEvt(null)
                  }
                : undefined
            }
          />
        </Group>

        <p className="pb-4 text-center text-xs text-slate-400">Chollo v1.0 · Datos de demostración</p>
      </div>

      <BottomSheet open={sheet === 'currency'} onClose={() => setSheet(null)} title="Moneda">
        <OptionList
          options={Object.entries(CURRENCIES).map(([c, v]) => ({ value: c, label: c, hint: v.symbol }))}
          value={currency}
          onChange={(v) => {
            setCurrency(v)
            setSheet(null)
          }}
        />
      </BottomSheet>
      <BottomSheet open={sheet === 'origin'} onClose={() => setSheet(null)} title="Aeropuerto de origen">
        <OptionList
          options={ORIGINS.map((o) => ({ value: o.code, label: o.city, hint: o.code }))}
          value={origin}
          onChange={(v) => {
            setOrigin(v)
            setSheet(null)
          }}
        />
      </BottomSheet>
    </div>
  )
}

function Stat({ icon: Icon, value, label }) {
  return (
    <Card className="!rounded-2xl p-3 text-center">
      <Icon size={18} className="mx-auto text-brand-500" />
      <p className="mt-1 truncate text-lg font-extrabold">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </Card>
  )
}

function Group({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-bold tracking-wider text-slate-500 uppercase">{title}</h3>
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-ink-700">{children}</Card>
    </section>
  )
}

function Row({ icon: Icon, label, value, onClick, children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-ink-700 dark:text-slate-300">
        <Icon size={17} />
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {children ?? (
        <span className="flex items-center gap-1 text-sm text-slate-500">
          {value}
          {onClick && <ChevronRight size={16} />}
        </span>
      )}
    </Tag>
  )
}
