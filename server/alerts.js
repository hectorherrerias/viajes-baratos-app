// Alertas de precio vigiladas por el servidor: la app sincroniza aquí sus alertas y, cada pocas
// horas, se comprueba el precio real de cada ruta. Si baja al objetivo, aviso por Telegram
// (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID). No repite el aviso salvo que baje otro 5 % o más.
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR ?? path.resolve('data')
const FILE = path.join(DATA_DIR, 'alerts.json')
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const TG_CHAT = process.env.TELEGRAM_CHAT_ID ?? ''
const IATA = /^[A-Z]{3}$/

// devices: lista de alertas de cada dispositivo (iPhone, iPad...); se vigilan todas juntas
let db = { devices: {}, notified: {} }
try {
  db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf-8')) }
} catch {
  // primera vez: sin alertas guardadas
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(db, null, 1))
  fs.renameSync(`${FILE}.tmp`, FILE)
}

export const telegramEnabled = () => Boolean(TG_TOKEN && TG_CHAT)

/** Alertas activas de todos los dispositivos, una por ruta (con el objetivo más alto). */
function activeAlerts() {
  const byRoute = new Map()
  for (const list of Object.values(db.devices)) {
    for (const a of list) {
      if (!a.active) continue
      const id = `${a.origin}-${a.dest}`
      const prev = byRoute.get(id)
      if (!prev || a.target > prev.target) byRoute.set(id, { id, origin: a.origin, dest: a.dest, target: a.target })
    }
  }
  return [...byRoute.values()]
}

/** Guarda la lista de alertas de un dispositivo (validada, máximo 30). */
export function setAlerts(device, list) {
  if (!Array.isArray(list)) throw Object.assign(new Error('Formato no válido'), { status: 400 })
  const key = String(device || 'sin-id').replace(/[^\w-]/g, '').slice(0, 40) || 'sin-id'
  db.devices[key] = list
    .filter((a) => a && IATA.test(String(a.origin)) && IATA.test(String(a.dest)) && Number(a.target) > 0)
    .slice(0, 30)
    .map((a) => ({ origin: a.origin, dest: a.dest, target: Math.round(Number(a.target) * 100) / 100, active: a.active !== false }))
  // Olvidar avisos de rutas que ya nadie vigila
  const ids = new Set(activeAlerts().map((a) => a.id))
  for (const id of Object.keys(db.notified)) if (!ids.has(id)) delete db.notified[id]
  save()
  return { count: ids.size, telegram: telegramEnabled() }
}

async function sendTelegram(html) {
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) throw new Error(`Telegram ${r.status}`)
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmtDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/** Comprueba las alertas activas con la función de precios del servidor y avisa de las cumplidas. */
export async function checkAlerts(routePrices) {
  const active = activeAlerts()
  if (!active.length || !telegramEnabled()) return 0
  const deals = await routePrices(active.map((a) => [a.origin, a.dest]))
  let sent = 0
  for (const a of active) {
    const deal = deals.find((d) => d?.origin?.code === a.origin && d?.code === a.dest)
    if (!deal || deal.price == null) continue
    const last = db.notified[a.id]
    if (deal.price > a.target) {
      if (last) delete db.notified[a.id] // vuelve a avisar cuando baje otra vez
      continue
    }
    if (last && deal.price > last.price * 0.95) continue
    try {
      await sendTelegram(
        `✈️ <b>Chollo: ${esc(deal.origin.city)} → ${esc(deal.city)}</b>\n` +
        `<b>${deal.price.toFixed(2).replace('.', ',')} €</b> ida y vuelta (tu objetivo: ${a.target} €)\n` +
        `🗓️ ${fmtDate(deal.outDate)} → ${fmtDate(deal.backDate)} · ${deal.nights} noches · ${esc(deal.airline)}\n` +
        `<a href="${esc(deal.bookingUrl)}">Ver en la web de la aerolínea</a>`
      )
      db.notified[a.id] = { price: deal.price, at: new Date().toISOString() }
      sent++
    } catch (e) {
      console.warn(`[alertas] no se pudo avisar ${a.origin}-${a.dest}: ${e.message}`)
    }
  }
  save()
  if (sent) console.log(`[alertas] ${sent} aviso(s) enviados por Telegram`)
  return sent
}
