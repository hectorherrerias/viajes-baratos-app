# ✈️ Chollo · Viajes ultra low-cost (PWA)

Aplicación web progresiva **mobile-first** para buscar y comparar vuelos, buses y alojamiento ultra económicos con **precios reales consultados en directo**. Diseño premium con modo claro/oscuro, transiciones suaves y tarjetas visuales.

## Fuentes de datos (reales)

| Qué | Fuente | Cómo se usa |
|---|---|---|
| Vuelos | API pública de tarifas de **Ryanair** | Ida y vuelta más barata por destino, precio por día de cada tramo, rutas directas de cada aeropuerto |
| Buses y trenes | API pública de búsqueda de **FlixBus** | Trayectos, horarios, plazas y precio en la fecha del viaje |
| Alojamiento | **Booking.com**, **Hostelworld**, **Airbnb** | Enlaces de búsqueda con fechas, presupuesto por noche, tipo, valoración y cancelación gratuita ya aplicados |
| Tipos de cambio | **BCE** vía Frankfurter | Conversión EUR → USD/GBP |
| Fotos | Wikipedia / Unsplash | Imagen de cada destino |

Las etiquetas de las ofertas se calculan con datos reales:

- **Superchollo**: ida y vuelta por 30 € o menos.
- **Bajada de precio**: más barato que en la última consulta registrada (o que el precio anterior que indica Ryanair).
- **Mínimo registrado**: el precio más bajo desde que la app vigila la ruta (mínimo 3 días de histórico).
- **Posible error fare**: ha caído a la mitad o menos respecto a la consulta anterior, o está por debajo del 35 % de la mediana histórica.
- **Escapada finde**: sale en jueves o viernes y dura 3 noches o menos.

El servidor guarda cada día el precio mínimo de cada ruta en `data/history.json` y consulta en segundo plano cada 3 h los aeropuertos de `WARM_ORIGINS`. Así el histórico crece solo y las etiquetas de bajada, mínimo y error fare se vuelven más fiables con el tiempo.

> Las APIs de Ryanair y FlixBus no son oficiales ni están documentadas: pueden cambiar sin aviso. La app está pensada para uso personal. El precio final se confirma siempre en la web del proveedor.

## Funcionalidades

| Pantalla | Qué incluye |
|---|---|
| **Inicio** | Destinos con precio real desde tu aeropuerto, carrusel de los más baratos y *Chollos del día* filtrables por etiqueta |
| **Buscar** | Origen y destino (rutas directas reales o *Cualquier destino*), fechas exactas o flexibles (*Cualquier fecha* / *Mes más barato* con el precio real de cada mes), noches y viajeros |
| **Comparador** | Pestañas Vuelos / Estancia / Tierra: opciones de ida y vuelta con el precio de cada tramo, enlaces de alojamiento filtrados y buses FlixBus, con un resumen del ahorro |
| **Filtros** | Presupuesto de vuelo, franja de salida, orden (precio, fecha, duración) y, para el alojamiento, presupuesto por noche, tipo, valoración mínima y cancelación gratuita |
| **Detalle** | Itinerario con número de vuelo, gráfico interactivo del precio de la ida por día (30/60/90 días), día más barato, histórico registrado, reservar en la web oficial, favorito, compartir y crear alerta |
| **Favoritos** | Guardado persistente (localStorage) filtrable por tipo |
| **Alertas** | Precio actual real de cada ruta vigilada, progreso hacia el objetivo y novedades (objetivos alcanzados, bajadas y posibles error fares) |
| **Perfil** | Tema, moneda con tipo de cambio del BCE, aeropuerto de origen, preferencias de novedades, fuentes de datos e instalación de la PWA |

## Stack

- **React 19** + **Vite** + **Tailwind CSS v4** + **Lucide**
- **Node.js ≥ 20** sin dependencias para la API (`server/`): proxy con caché, límite de concurrencia, respaldo con el último dato bueno y gzip
- Gráficos en **SVG puro**
- **Docker** (una sola imagen Node con la API y los estáticos)

## Estructura

```
server/
├── index.js        # API (/api/*) + ficheros estáticos de dist/
├── providers.js    # Ryanair, FlixBus, BCE, Wikipedia
├── history.js      # Histórico de precios persistente y etiquetas
└── http.js         # fetch con caché, concurrencia y respaldo
src/
├── App.jsx                 # Shell: marco móvil, pestañas, detalle, capa de overlays
├── context/AppContext.jsx  # Preferencias, favoritos, alertas, tipos de cambio, aeropuertos
├── lib/api.js              # Cliente de la API con caché + hook useApi
├── data/constants.js       # Etiquetas y enlaces de alojamiento
├── components/             # UI, tarjetas, filtros, navegación, gráfico
└── views/                  # Home, Search (+ comparador), DealDetail, Favorites, Alerts, Profile
```

## Desarrollo local

```bash
npm install
npm run dev:api   # API en http://localhost:3000
npm run dev       # Frontend en http://localhost:5173 (redirige /api al 3000)
```

O todo junto como en producción: `npm run build && npm start` → `http://localhost:3000`.

## Docker

```bash
docker compose up -d --build
```

La app queda en `http://<ip-del-servidor>:8020`. Variables (en `.env` junto al `docker-compose.yml`):

| Variable | Por defecto | Para qué |
|---|---|---|
| `APP_PORT` | `8020` | Puerto del host |
| `WARM_ORIGINS` | `MAD,BCN,VLC,AGP,SVQ,ALC` | Aeropuertos que se consultan en segundo plano para construir el histórico |

El histórico se guarda en `./data`, que debe poder escribir el usuario `node` (uid 1000) del contenedor.
