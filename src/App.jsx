// Shell de la app: marco de móvil, navegación por pestañas y vista de detalle
import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from './components/Navigation'
import { Toast } from './components/ui'
import { HomeView } from './views/HomeView'
import { SearchView } from './views/SearchView'
import { FavoritesView } from './views/FavoritesView'
import { AlertsView } from './views/AlertsView'
import { ProfileView } from './views/ProfileView'
import { DealDetail } from './views/DealDetail'

export default function App() {
  const [tab, setTab] = useState('home')
  const [detail, setDetail] = useState(null)
  const [searchPreset, setSearchPreset] = useState(null)
  const scrollRef = useRef(null)

  // Integración con el botón "atrás" del móvil: cerrar el detalle
  useEffect(() => {
    const onPop = () => setDetail(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openDetail = useCallback((item) => {
    history.pushState({ detail: item.id }, '')
    setDetail(item)
  }, [])
  const closeDetail = useCallback(() => {
    if (history.state?.detail) history.back()
    else setDetail(null)
  }, [])

  const goTab = (t) => {
    if (t === tab) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    else {
      setTab(t)
      scrollRef.current?.scrollTo({ top: 0 })
    }
  }

  const compare = (preset) => {
    closeDetail()
    setSearchPreset({ ...preset, _t: Date.now() })
    setTab('search')
  }

  return (
    // En escritorio se muestra dentro de un marco de smartphone; en móvil ocupa toda la pantalla
    <div className="flex h-full items-center justify-center sm:p-6">
      <div className="relative h-full w-full overflow-hidden bg-canvas dark:bg-ink-900 sm:h-[min(880px,100%)] sm:max-w-[420px] sm:rounded-[2.75rem] sm:border-[10px] sm:border-slate-900 sm:shadow-2xl sm:shadow-slate-900/30 dark:sm:border-ink-700">
        <main ref={scrollRef} className="no-scrollbar pt-safe h-full overflow-y-auto overscroll-contain">
          <div key={tab} className="animate-fade-up">
            {tab === 'home' && <HomeView onOpen={openDetail} onGoSearch={() => goTab('search')} />}
            {tab === 'favorites' && <FavoritesView onOpen={openDetail} onExplore={() => goTab('home')} />}
            {tab === 'alerts' && <AlertsView />}
            {tab === 'profile' && <ProfileView />}
          </div>
          {/* Buscar se mantiene montado para conservar el formulario y los resultados */}
          <div hidden={tab !== 'search'} className={tab === 'search' ? 'animate-fade-up' : undefined}>
            <SearchView onOpen={openDetail} preset={searchPreset} />
          </div>
        </main>

        <BottomNav tab={tab} onChange={goTab} />
        {detail && <DealDetail key={detail.id} item={detail} onClose={closeDetail} onCompare={compare} />}
        {/* Capa de overlays (hojas inferiores, botón flotante): los portales se montan aquí */}
        <div id="overlay-root" className="pointer-events-none absolute inset-0 z-[55]" />
        <Toast />
      </div>
    </div>
  )
}
