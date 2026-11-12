/**
 * API de Stashly para Cloudflare Workers + D1.
 *
 * Mantiene los mismos endpoints que el servidor Express para que el cliente
 * funcione sin cambios. El frontend se sirve desde el binding ASSETS.
 */

const SESSION_COOKIE = 'stashly_session'
const SESSION_TTL = 30 * 86_400_000
const PBKDF2_ITERATIONS = 120_000

/* ------------------------------------------------------------------ */
/* Respuestas y utilidades                                             */
/* ------------------------------------------------------------------ */

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  })
}

function fail(message, status = 400) {
  return json({ error: message }, status)
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase()
}

function isValidIdentity(identity) {
  if (identity.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)
  }
  return /^[a-z0-9._-]{3,30}$/.test(identity)
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || ''
  const cookies = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const name = part.slice(0, index).trim()
    if (!name) continue
    cookies[name] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return cookies
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin')
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    Vary: 'Origin',
  }
}

function withCors(response, request) {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(corsHeaders(request))) {
    headers.set(name, value)
  }
  return new Response(response.body, { status: response.status, headers })
}

/* ------------------------------------------------------------------ */
/* Contraseñas y sesiones                                              */
/* ------------------------------------------------------------------ */

function toHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex) {
  const clean = String(hex || '')
  if (clean.length % 2 !== 0) return new Uint8Array()
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function derivePassword(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    256,
  )
  return new Uint8Array(bits)
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations < 1) return false
  const expected = parts[3]
  const actual = toHex(await derivePassword(password, fromHex(parts[2]), iterations))
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let i = 0; i < actual.length; i += 1) {
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return difference === 0
}

async function createSession(env, userId) {
  const id = crypto.randomUUID()
  const now = Date.now()
  const expiresAt = now + SESSION_TTL
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run()
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(id, userId, expiresAt, now)
    .run()
  return { id, expiresAt }
}

async function currentSession(request, env) {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (!token) return null
  return env.DB.prepare(
    'SELECT s.user_id, s.expires_at, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?',
  )
    .bind(token, Date.now())
    .first()
}

function sessionCookie(token, expiresAt, secure) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor((expiresAt - Date.now()) / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

function clearSessionCookie(secure) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

/* ------------------------------------------------------------------ */
/* Scraper ligero (sin cheerio)                                        */
/* ------------------------------------------------------------------ */

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
}

function parsePrice(text) {
  if (!text) return { price: null, priceValue: null, currency: null }
  const cleaned = String(text).replace(/\s+/g, ' ').trim()
  const match = cleaned.match(/([€$£¥]\s*[\d.,]+|\d+[.,]\d+\s*[€$£¥])/i)
  if (match) {
    const priceStr = match[1]
    const numMatch = priceStr.match(/[\d]+[.,][\d]{2}|[\d]+/)
    if (numMatch) {
      const priceValue = Number.parseFloat(numMatch[0].replace(',', '.'))
      const currency = priceStr.includes('€')
        ? 'EUR'
        : priceStr.includes('$')
          ? 'USD'
          : priceStr.includes('£')
            ? 'GBP'
            : null
      return { price: priceStr.trim(), priceValue, currency }
    }
    return { price: priceStr.trim(), priceValue: null, currency: null }
  }
  const numberMatch = cleaned.match(/([\d]{1,4}[.,][\d]{2})/)
  if (numberMatch) {
    return {
      price: numberMatch[1],
      priceValue: Number.parseFloat(numberMatch[1].replace(',', '.')),
      currency: null,
    }
  }
  return { price: null, priceValue: null, currency: null }
}

function storeFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function findProduct(node) {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const entry of node) {
      const product = findProduct(entry)
      if (product) return product
    }
    return null
  }
  const type = node['@type']
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return node
  if (node['@graph']) return findProduct(node['@graph'])
  return null
}

function metaTags(html) {
  const tags = {}
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0]
    const key = /(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase()
    const content = /content=["']([^"']*)["']/i.exec(tag)?.[1]
    if (key && content && !(key in tags)) tags[key] = decodeEntities(content)
  }
  return tags
}

async function scrapeUrl(url) {
  const base = {
    url,
    title: null,
    image: null,
    price: null,
    priceValue: null,
    currency: null,
    store: storeFromUrl(url),
  }
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })
    if (!response.ok) return base
    const html = await response.text()

    let title = null
    let image = null
    let price = null
    let priceValue = null
    let currency = null

    for (const match of html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      try {
        const product = findProduct(JSON.parse(match[1]))
        if (!product) continue
        if (product.name && !title) title = String(product.name)
        if (product.image && !image) {
          image = Array.isArray(product.image)
            ? product.image[0]
            : typeof product.image === 'object'
              ? product.image.url
              : product.image
        }
        if (product.offers && !price) {
          const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers
          if (offer?.price) {
            price = `${offer.price}${offer.priceCurrency ? ` ${offer.priceCurrency}` : ''}`
            priceValue = Number.parseFloat(offer.price)
            currency = offer.priceCurrency || null
          }
        }
      } catch {
        /* JSON-LD inválido: seguimos con los metadatos */
      }
    }

    const meta = metaTags(html)
    if (!title) {
      title =
        meta['og:title'] ||
        meta['twitter:title'] ||
        decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '')
    }
    if (!image) {
      image =
        meta['og:image'] ||
        meta['og:image:secure_url'] ||
        meta['twitter:image'] ||
        meta['twitter:image:src'] ||
        null
    }

    if (!price) {
      const contentPrice =
        /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1] ||
        /content=["']([^"']+)["'][^>]*itemprop=["']price["']/i.exec(html)?.[1]
      const offscreen =
        /class=["'][^"']*a-offscreen[^"']*["'][^>]*>([^<]+)</i.exec(html)?.[1] ||
        /data-price=["']([^"']+)["']/i.exec(html)?.[1]
      const parsed = parsePrice(contentPrice || offscreen || '')
      if (parsed.price) {
        price = parsed.price
        priceValue = parsed.priceValue
        currency = parsed.currency
      }
    }

    if (title) title = decodeEntities(String(title)).trim().slice(0, 500) || null
    if (image && image.startsWith('//')) image = `https:${image}`
    if (image && image.startsWith('/')) {
      try {
        image = new URL(image, url).origin + image
      } catch {
        /* dejamos la imagen relativa */
      }
    }

    return { url, title, image, price, priceValue, currency, store: base.store }
  } catch {
    return base
  }
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const routes = []

function add(method, pattern, handler, options = {}) {
  const keys = []
  const source = pattern
    .split('/')
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1))
        return '([^/]+)'
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  routes.push({
    method,
    regex: new RegExp(`^/${source}/?$`),
    keys,
    handler,
    public: Boolean(options.public),
  })
}

function matchRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue
    const match = route.regex.exec(pathname)
    if (!match) continue
    const params = {}
    route.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1])
    })
    return { route, params }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Autenticación                                                       */
/* ------------------------------------------------------------------ */

add(
  'POST',
  '/api/auth/register',
  async ({ request, env, url }) => {
    const body = await readJson(request)
    if (!body) return fail('Datos inválidos')
    const identity = normalizeIdentity(body.email)
    const password = String(body.password || '')
    if (!identity || !password) return fail('Usuario/correo y contraseña requeridos')
    if (!isValidIdentity(identity)) {
      return fail('Usa un usuario de 3 a 30 caracteres o un correo válido')
    }
    if (password.length < 6) return fail('La contraseña debe tener al menos 6 caracteres')

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(identity)
      .first()
    if (existing) return fail('Esta cuenta ya está registrada')

    const userId = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    const now = Date.now()
    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    )
      .bind(userId, identity, passwordHash, now)
      .run()
    await env.DB.prepare(
      'INSERT INTO collections (id, user_id, name, position, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    )
      .bind(crypto.randomUUID(), userId, 'Mi lista', now, now)
      .run()

    const session = await createSession(env, userId)
    return json({ user: { id: userId, email: identity } }, 200, {
      'Set-Cookie': sessionCookie(session.id, session.expiresAt, url.protocol === 'https:'),
    })
  },
  { public: true },
)

add(
  'POST',
  '/api/auth/login',
  async ({ request, env, url }) => {
    const body = await readJson(request)
    if (!body) return fail('Datos inválidos')
    const identity = normalizeIdentity(body.email)
    const password = String(body.password || '')
    if (!identity || !password) return fail('Usuario/correo y contraseña requeridos')

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
      .bind(identity)
      .first()
    if (!user) return fail('Usuario/correo o contraseña incorrectos', 401)

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return fail('Usuario/correo o contraseña incorrectos', 401)

    const session = await createSession(env, user.id)
    return json({ user: { id: user.id, email: user.email } }, 200, {
      'Set-Cookie': sessionCookie(session.id, session.expiresAt, url.protocol === 'https:'),
    })
  },
  { public: true },
)

add(
  'POST',
  '/api/auth/logout',
  async ({ request, env, url }) => {
    const token = parseCookies(request)[SESSION_COOKIE]
    if (token) {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run()
    }
    return json({ ok: true }, 200, {
      'Set-Cookie': clearSessionCookie(url.protocol === 'https:'),
    })
  },
  { public: true },
)

add('GET', '/api/auth/me', async ({ user }) => json({ user }))

/* ------------------------------------------------------------------ */
/* Carpetas                                                            */
/* ------------------------------------------------------------------ */

function rowToCollection(row) {
  return row ? { ...row, collapsed: Boolean(row.collapsed) } : null
}

add('GET', '/api/collections', async ({ env, user }) => {
  const { results } = await env.DB.prepare(
    'SELECT * FROM collections WHERE user_id = ? ORDER BY position ASC, created_at ASC',
  )
    .bind(user.id)
    .all()
  return json(results.map(rowToCollection))
})

add('POST', '/api/collections', async ({ request, env, user }) => {
  const body = await readJson(request)
  const name = String(body?.name ?? '').trim()
  if (!name) return fail('Nombre requerido')

  const id = crypto.randomUUID()
  const now = Date.now()
  const max = await env.DB.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM collections WHERE user_id = ?',
  )
    .bind(user.id)
    .first()

  await env.DB.prepare(
    'INSERT INTO collections (id, user_id, name, color, icon, position, collapsed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
  )
    .bind(id, user.id, name, body?.color || null, body?.icon || null, max?.pos ?? 0, now, now)
    .run()

  const collection = await env.DB.prepare('SELECT * FROM collections WHERE id = ?')
    .bind(id)
    .first()
  return json(rowToCollection(collection))
})

add('PUT', '/api/collections/:id', async ({ request, env, user, params }) => {
  const body = await readJson(request)
  if (!body) return fail('Datos inválidos')

  const sets = []
  const values = []
  if (body.name !== undefined) {
    sets.push('name = ?')
    values.push(String(body.name).trim())
  }
  if (body.color !== undefined) {
    sets.push('color = ?')
    values.push(body.color)
  }
  if (body.icon !== undefined) {
    sets.push('icon = ?')
    values.push(body.icon)
  }
  if (body.position !== undefined) {
    sets.push('position = ?')
    values.push(body.position)
  }
  if (body.collapsed !== undefined) {
    sets.push('collapsed = ?')
    values.push(body.collapsed ? 1 : 0)
  }
  sets.push('updated_at = ?')
  values.push(Date.now())
  values.push(params.id, user.id)

  const result = await env.DB.prepare(
    `UPDATE collections SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
  )
    .bind(...values)
    .run()
  if (!result.meta?.changes) return fail('Carpeta no encontrada', 404)

  const collection = await env.DB.prepare('SELECT * FROM collections WHERE id = ?')
    .bind(params.id)
    .first()
  return json(rowToCollection(collection))
})

add('DELETE', '/api/collections/:id', async ({ env, user, params }) => {
  await env.DB.prepare(
    'UPDATE items SET collection_id = NULL, updated_at = ? WHERE collection_id = ? AND user_id = ?',
  )
    .bind(Date.now(), params.id, user.id)
    .run()
  const result = await env.DB.prepare('DELETE FROM collections WHERE id = ? AND user_id = ?')
    .bind(params.id, user.id)
    .run()
  if (!result.meta?.changes) return fail('Carpeta no encontrada', 404)
  return json({ ok: true })
})

/* ------------------------------------------------------------------ */
/* Productos                                                           */
/* ------------------------------------------------------------------ */

function rowToItem(row) {
  if (!row) return null
  return {
    ...row,
    is_favorite: Boolean(row.is_favorite),
    is_purchased: Boolean(row.is_purchased),
    is_deleted: Boolean(row.is_deleted),
  }
}

add('GET', '/api/items', async ({ request, env, user }) => {
  const url = new URL(request.url)
  const collectionId = url.searchParams.get('collection_id')
  const includeDeleted = url.searchParams.get('include_deleted') === 'true'

  let sql = 'SELECT * FROM items WHERE user_id = ? AND is_deleted = ?'
  const params = [user.id, includeDeleted ? 1 : 0]
  if (collectionId && collectionId !== 'all') {
    sql += ' AND collection_id = ?'
    params.push(collectionId)
  }
  sql += ' ORDER BY position ASC, added_at DESC'

  const { results } = await env.DB.prepare(sql).bind(...params).all()
  return json(results.map(rowToItem))
})

add('POST', '/api/items/scrape', async ({ request, env, user }) => {
  const body = await readJson(request)
  const itemUrl = String(body?.url || '').trim()
  if (!itemUrl) return fail('URL requerida')
  try {
    new URL(itemUrl)
  } catch {
    return fail('URL inválida')
  }

  const existing = await env.DB.prepare(
    'SELECT id, title FROM items WHERE user_id = ? AND url = ? AND is_deleted = 0',
  )
    .bind(user.id, itemUrl)
    .first()
  if (existing) {
    return json({
      duplicate: true,
      existingId: existing.id,
      existingTitle: existing.title,
      scraped: null,
    })
  }

  const scraped = await scrapeUrl(itemUrl)
  return json({ duplicate: false, scraped })
})

add('POST', '/api/items', async ({ request, env, user }) => {
  const body = await readJson(request)
  if (!body) return fail('Datos inválidos')
  const itemUrl = String(body.url || '').trim()
  if (!itemUrl) return fail('URL requerida')

  const existing = await env.DB.prepare(
    'SELECT id FROM items WHERE user_id = ? AND url = ? AND is_deleted = 0',
  )
    .bind(user.id, itemUrl)
    .first()
  if (existing) return fail('Esta URL ya está guardada')

  const id = crypto.randomUUID()
  const now = Date.now()
  const max = await env.DB.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM items WHERE user_id = ? AND is_deleted = 0',
  )
    .bind(user.id)
    .first()

  await env.DB.prepare(
    `INSERT INTO items (id, user_id, collection_id, url, title, image, price, price_value, currency, store, notes, target_price, is_favorite, is_purchased, is_deleted, position, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`,
  )
    .bind(
      id,
      user.id,
      body.collection_id || null,
      itemUrl,
      body.title || null,
      body.image || null,
      body.price || null,
      body.price_value ?? null,
      body.currency || null,
      body.store || null,
      body.notes || null,
      body.target_price ?? null,
      max?.pos ?? 0,
      now,
      now,
    )
    .run()

  if (body.price || body.price_value) {
    await env.DB.prepare(
      'INSERT INTO price_history (id, item_id, price, price_value, currency, recorded_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(
        crypto.randomUUID(),
        id,
        body.price || null,
        body.price_value ?? null,
        body.currency || null,
        now,
      )
      .run()
  }

  const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first()
  return json(rowToItem(item))
})

add('PUT', '/api/items/:id', async ({ request, env, user, params }) => {
  const body = await readJson(request)
  if (!body) return fail('Datos inválidos')

  const sets = []
  const values = []
  const now = Date.now()

  for (const field of ['collection_id', 'title', 'image', 'price', 'price_value', 'currency', 'notes', 'target_price']) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`)
      values.push(body[field])
    }
  }
  if (body.is_favorite !== undefined) {
    sets.push('is_favorite = ?')
    values.push(body.is_favorite ? 1 : 0)
  }
  if (body.is_purchased !== undefined) {
    sets.push('is_purchased = ?')
    values.push(body.is_purchased ? 1 : 0)
    if (body.is_purchased) {
      sets.push('purchased_at = ?')
      values.push(now)
    } else {
      sets.push('purchased_at = NULL')
    }
  }
  if (body.position !== undefined) {
    sets.push('position = ?')
    values.push(body.position)
  }
  sets.push('updated_at = ?')
  values.push(now)
  values.push(params.id, user.id)

  const result = await env.DB.prepare(
    `UPDATE items SET ${sets.join(', ')} WHERE id = ? AND user_id = ? AND is_deleted = 0`,
  )
    .bind(...values)
    .run()
  if (!result.meta?.changes) return fail('Item no encontrado', 404)

  if (body.price !== undefined || body.price_value !== undefined) {
    const item = await env.DB.prepare(
      'SELECT price, price_value, currency FROM items WHERE id = ?',
    )
      .bind(params.id)
      .first()
    const last = await env.DB.prepare(
      'SELECT price, price_value FROM price_history WHERE item_id = ? ORDER BY recorded_at DESC LIMIT 1',
    )
      .bind(params.id)
      .first()
    if (!last || last.price_value !== item.price_value || last.price !== item.price) {
      await env.DB.prepare(
        'INSERT INTO price_history (id, item_id, price, price_value, currency, recorded_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          crypto.randomUUID(),
          params.id,
          item.price,
          item.price_value,
          item.currency,
          now,
        )
        .run()
    }
  }

  const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(params.id)
    .first()
  return json(rowToItem(item))
})

add('DELETE', '/api/items/:id', async ({ env, user, params }) => {
  const now = Date.now()
  const result = await env.DB.prepare(
    'UPDATE items SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(now, now, params.id, user.id)
    .run()
  if (!result.meta?.changes) return fail('Item no encontrado', 404)
  return json({ ok: true })
})

add('POST', '/api/items/:id/restore', async ({ env, user, params }) => {
  const now = Date.now()
  const result = await env.DB.prepare(
    'UPDATE items SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(now, params.id, user.id)
    .run()
  if (!result.meta?.changes) return fail('Item no encontrado', 404)
  const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(params.id)
    .first()
  return json(rowToItem(item))
})

add('DELETE', '/api/items/:id/permanent', async ({ env, user, params }) => {
  const result = await env.DB.prepare('DELETE FROM items WHERE id = ? AND user_id = ?')
    .bind(params.id, user.id)
    .run()
  if (!result.meta?.changes) return fail('Item no encontrado', 404)
  return json({ ok: true })
})

add('GET', '/api/items/:id/history', async ({ env, user, params }) => {
  const owned = await env.DB.prepare('SELECT id FROM items WHERE id = ? AND user_id = ?')
    .bind(params.id, user.id)
    .first()
  if (!owned) return fail('Item no encontrado', 404)
  const { results } = await env.DB.prepare(
    'SELECT * FROM price_history WHERE item_id = ? ORDER BY recorded_at ASC',
  )
    .bind(params.id)
    .all()
  return json(results)
})

add('POST', '/api/items/bulk', async ({ request, env, user }) => {
  const body = await readJson(request)
  const ids = Array.isArray(body?.ids) ? body.ids : []
  if (!ids.length) return fail('IDs requeridos')
  const now = Date.now()
  const placeholders = ids.map(() => '?').join(',')

  if (body.action === 'move') {
    await env.DB.prepare(
      `UPDATE items SET collection_id = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`,
    )
      .bind(body.collection_id || null, now, ...ids, user.id)
      .run()
  } else if (body.action === 'purchase') {
    await env.DB.prepare(
      `UPDATE items SET is_purchased = 1, purchased_at = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`,
    )
      .bind(now, now, ...ids, user.id)
      .run()
  } else if (body.action === 'unpurchase') {
    await env.DB.prepare(
      `UPDATE items SET is_purchased = 0, purchased_at = NULL, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`,
    )
      .bind(now, ...ids, user.id)
      .run()
  } else if (body.action === 'delete') {
    await env.DB.prepare(
      `UPDATE items SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`,
    )
      .bind(now, now, ...ids, user.id)
      .run()
  } else if (body.action === 'favorite') {
    await env.DB.prepare(
      `UPDATE items SET is_favorite = 1, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`,
    )
      .bind(now, ...ids, user.id)
      .run()
  } else if (body.action === 'unfavorite') {
    await env.DB.prepare(
      `UPDATE items SET is_favorite = 0, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`,
    )
      .bind(now, ...ids, user.id)
      .run()
  }

  return json({ ok: true, count: ids.length })
})

/* ------------------------------------------------------------------ */
/* Exportar / importar                                                 */
/* ------------------------------------------------------------------ */

add('GET', '/api/sync/export', async ({ env, user }) => {
  const collections = await env.DB.prepare('SELECT * FROM collections WHERE user_id = ?')
    .bind(user.id)
    .all()
  const items = await env.DB.prepare('SELECT * FROM items WHERE user_id = ?').bind(user.id).all()
  const history = await env.DB.prepare(
    'SELECT ph.* FROM price_history ph JOIN items i ON i.id = ph.item_id WHERE i.user_id = ?',
  )
    .bind(user.id)
    .all()

  return json({
    version: 1,
    exported_at: Date.now(),
    collections: collections.results,
    items: items.results,
    price_history: history.results,
  })
})

add('POST', '/api/sync/import', async ({ request, env, user }) => {
  const body = await readJson(request)
  if (!body) return fail('Datos inválidos')
  const collections = Array.isArray(body.collections) ? body.collections : []
  const items = Array.isArray(body.items) ? body.items : []
  const history = Array.isArray(body.price_history) ? body.price_history : []
  const now = Date.now()

  for (const collection of collections) {
    const existing = await env.DB.prepare(
      'SELECT id FROM collections WHERE id = ? AND user_id = ?',
    )
      .bind(collection.id, user.id)
      .first()
    if (existing) {
      await env.DB.prepare(
        'UPDATE collections SET name=?, color=?, icon=?, position=?, collapsed=?, updated_at=? WHERE id=? AND user_id=?',
      )
        .bind(
          collection.name,
          collection.color,
          collection.icon,
          collection.position || 0,
          collection.collapsed ? 1 : 0,
          now,
          collection.id,
          user.id,
        )
        .run()
    } else {
      await env.DB.prepare(
        'INSERT INTO collections (id, user_id, name, color, icon, position, collapsed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          collection.id,
          user.id,
          collection.name,
          collection.color,
          collection.icon,
          collection.position || 0,
          collection.collapsed ? 1 : 0,
          collection.created_at || now,
          now,
        )
        .run()
    }
  }

  for (const item of items) {
    const existing = await env.DB.prepare('SELECT id FROM items WHERE id = ? AND user_id = ?')
      .bind(item.id, user.id)
      .first()
    if (existing) {
      await env.DB.prepare(
        `UPDATE items SET collection_id=?, url=?, title=?, image=?, price=?, price_value=?, currency=?, store=?, notes=?, target_price=?, is_favorite=?, is_purchased=?, is_deleted=?, position=?, purchased_at=?, deleted_at=?, updated_at=? WHERE id=? AND user_id=?`,
      )
        .bind(
          item.collection_id,
          item.url,
          item.title,
          item.image,
          item.price,
          item.price_value,
          item.currency,
          item.store,
          item.notes,
          item.target_price,
          item.is_favorite ? 1 : 0,
          item.is_purchased ? 1 : 0,
          item.is_deleted ? 1 : 0,
          item.position || 0,
          item.purchased_at,
          item.deleted_at,
          now,
          item.id,
          user.id,
        )
        .run()
    } else {
      await env.DB.prepare(
        `INSERT INTO items (id, user_id, collection_id, url, title, image, price, price_value, currency, store, notes, target_price, is_favorite, is_purchased, is_deleted, position, added_at, updated_at, purchased_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          item.id,
          user.id,
          item.collection_id,
          item.url,
          item.title,
          item.image,
          item.price,
          item.price_value,
          item.currency,
          item.store,
          item.notes,
          item.target_price,
          item.is_favorite ? 1 : 0,
          item.is_purchased ? 1 : 0,
          item.is_deleted ? 1 : 0,
          item.position || 0,
          item.added_at || now,
          now,
          item.purchased_at,
          item.deleted_at,
        )
        .run()
    }
  }

  for (const entry of history) {
    const existing = await env.DB.prepare('SELECT id FROM price_history WHERE id = ?')
      .bind(entry.id)
      .first()
    if (!existing) {
      await env.DB.prepare(
        'INSERT INTO price_history (id, item_id, price, price_value, currency, recorded_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          entry.id,
          entry.item_id,
          entry.price,
          entry.price_value,
          entry.currency,
          entry.recorded_at || now,
        )
        .run()
    }
  }

  return json({ ok: true })
})

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 })
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const matched = matchRoute(request.method, url.pathname)
    if (!matched) {
      return withCors(fail('Not found', 404), request)
    }

    try {
      let user = null
      if (!matched.route.public) {
        const session = await currentSession(request, env)
        if (!session) return withCors(fail('No autorizado', 401), request)
        user = { id: session.user_id, email: session.email }
      }

      const response = await matched.route.handler({
        request,
        env,
        url,
        params: matched.params,
        user,
      })
      return withCors(response, request)
    } catch (error) {
      console.error(error)
      return withCors(fail('Error interno', 500), request)
    }
  },
}
