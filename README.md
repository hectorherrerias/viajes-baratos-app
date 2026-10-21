# ✈️ Chollo · Viajes ultra low-cost (PWA)

Aplicación web progresiva **mobile-first** para buscar y comparar vuelos, alojamiento y transporte ultra económicos. Diseño premium con modo claro/oscuro, transiciones suaves y tarjetas visuales.

> Los datos (precios, ofertas, históricos) son **simulados** con un generador determinista: la app es un mockup interactivo totalmente funcional, listo para conectar a APIs reales (Skyscanner, Kiwi, Booking, FlixBus…).

## Funcionalidades

| Pantalla | Qué incluye |
|---|---|
| **Inicio** | Buscador rápido, banner de chollos, carrusel de los más baratos y *Chollos del día* con etiquetas (`Error Fare`, `Mínimo histórico`, `Vuelo directo`, `Flash 24h`, `Escapada finde`) filtrables por categoría |
| **Buscar** | Origen/destino (o *Cualquier destino*), fechas exactas o flexibles (*Cualquier fecha* / *Mes más barato* con gráfico de barras por mes), noches y viajeros |
| **Comparador** | Pestañas Vuelos / Estancia / Tierra (tren, bus, coche compartido), tarjeta *Mejor combo* con desglose vuelo + alojamiento, ahorro vs. transporte terrestre y CO₂ |
| **Filtros** | Presupuesto máximo (vuelo y noche), tipo de alojamiento, valoración mínima, cancelación gratuita, solo directos y orden (precio, duración, valoración, distancia) |
| **Detalle** | Hero visual, datos clave, **gráfico interactivo de evolución de precios** (30 d / 3 m / 6 m), recomendación de compra, presupuesto estimado, reservar, favorito, compartir y crear alerta |
| **Favoritos** | Guardado persistente (localStorage) filtrable por tipo |
| **Alertas** | Novedades de precio, rutas vigiladas con progreso hacia el objetivo, activar/pausar/eliminar y crear nuevas |
| **Perfil** | Tema claro/oscuro/sistema, moneda (EUR/USD/GBP), aeropuerto de origen, notificaciones e instalación de la PWA |

Además: cabecera con selector rápido de **origen** y **moneda**, barra de navegación inferior fija estilo nativo, botón *atrás* del móvil integrado, service worker offline y manifest instalable.

## Stack

- **React 19** + **Vite**
- **Tailwind CSS v4** (tema propio, modo oscuro por clase)
- **Lucide** para iconos
- Gráficos en **SVG puro** (sin librerías)
- **Nginx** en Docker para producción

## Estructura

```
src/
├── App.jsx                 # Shell: marco móvil, pestañas, detalle, capa de overlays
├── context/AppContext.jsx  # Estado global: tema, moneda, origen, favoritos, alertas, toasts
├── data/mockData.js        # Datos simulados y generadores (ofertas, búsquedas, históricos)
├── lib/                    # Formato de precios y hook useLocalStorage
├── components/
│   ├── ui.jsx              # Primitivas: Chip, Segmented, Toggle, BottomSheet, Toast, DealTag...
│   ├── Navigation.jsx      # BottomNav + Header con selectores de origen/moneda
│   ├── Cards.jsx           # DealCard, FlightCard, StayCard, TransportCard
│   ├── FilterSheet.jsx     # Hoja de filtros avanzados
│   └── PriceChart.jsx      # Gráfico interactivo de evolución de precios
└── views/                  # Home, Search (+ comparador), DealDetail, Favorites, Alerts, Profile
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` (en escritorio se muestra dentro de un marco de smartphone; en el móvil ocupa toda la pantalla).

## Docker

```bash
docker compose up -d --build
```

La app queda en `http://<ip-del-servidor>:8020`. Para usar otro puerto:

```bash
APP_PORT=8030 docker compose up -d --build
```

### Instalar en el móvil

Abre la URL en el navegador del móvil y usa **Añadir a pantalla de inicio**. El service worker requiere HTTPS o `localhost` para registrarse; detrás de una IP local sin HTTPS la app funciona igual, pero sin modo offline.
