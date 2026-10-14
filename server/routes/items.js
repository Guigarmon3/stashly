import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'
import db from '../lib/db.js'
import { scrapeUrl } from '../lib/scraper.js'

const router = Router()
router.use(requireAuth)

function rowToItem(row) {
  if (!row) return null
  return {
    ...row,
    is_favorite: !!row.is_favorite,
    is_purchased: !!row.is_purchased,
    is_deleted: !!row.is_deleted
  }
}

router.get('/', (req, res) => {
  try {
    const { collection_id, include_deleted } = req.query
    let sql = 'SELECT * FROM items WHERE user_id = ?'
    const params = [req.user.id]
    if (include_deleted === 'true') {
      sql += ' AND is_deleted = 1'
    } else {
      sql += ' AND is_deleted = 0'
    }
    if (collection_id && collection_id !== 'all') {
      sql += ' AND collection_id = ?'
      params.push(collection_id)
    }
    sql += ' ORDER BY position ASC, added_at DESC'
    const items = db.prepare(sql).all(...params)
    res.json(items.map(rowToItem))
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener items' })
  }
})

router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL requerida' })
    try {
      new URL(url)
    } catch {
      return res.status(400).json({ error: 'URL inválida' })
    }
    // Check duplicate
    const existing = db.prepare('SELECT id, title FROM items WHERE user_id = ? AND url = ? AND is_deleted = 0').get(req.user.id, url)
    if (existing) {
      return res.json({ duplicate: true, existingId: existing.id, existingTitle: existing.title, scraped: null })
    }
    const scraped = await scrapeUrl(url)
    res.json({ duplicate: false, scraped })
  } catch (e) {
    res.status(500).json({ error: 'Error al analizar URL' })
  }
})

router.post('/', (req, res) => {
  try {
    const { url, collection_id, title, image, price, price_value, currency, store, notes, target_price } = req.body
    if (!url) return res.status(400).json({ error: 'URL requerida' })
    
    // Check duplicate
    const existing = db.prepare('SELECT id FROM items WHERE user_id = ? AND url = ? AND is_deleted = 0').get(req.user.id, url)
    if (existing) return res.status(400).json({ error: 'Esta URL ya está guardada' })
    
    const id = uuidv4()
    const now = Date.now()
    const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM items WHERE user_id = ? AND is_deleted = 0').get(req.user.id)
    
    db.prepare(`INSERT INTO items (id, user_id, collection_id, url, title, image, price, price_value, currency, store, notes, target_price, is_favorite, is_purchased, is_deleted, position, added_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`).run(
      id, req.user.id, collection_id || null, url, title || null, image || null, price || null, price_value || null, currency || null, store || null, notes || null, target_price || null, maxPos.pos, now, now
    )
    
    // Save to price history if price exists
    if (price || price_value) {
      const phId = uuidv4()
      db.prepare('INSERT INTO price_history (id, item_id, price, price_value, currency, recorded_at) VALUES (?, ?, ?, ?, ?, ?)').run(phId, id, price || null, price_value || null, currency || null, now)
    }
    
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id)
    res.json(rowToItem(item))
  } catch (e) {
    res.status(500).json({ error: 'Error al guardar item' })
  }
})

router.put('/:id', (req, res) => {
  try {
    const { collection_id, title, image, price, price_value, currency, notes, target_price, is_favorite, is_purchased, position } = req.body
    const now = Date.now()
    const sets = []
    const values = []
    if (collection_id !== undefined) { sets.push('collection_id = ?'); values.push(collection_id || null) }
    if (title !== undefined) { sets.push('title = ?'); values.push(title) }
    if (image !== undefined) { sets.push('image = ?'); values.push(image) }
    if (price !== undefined) { sets.push('price = ?'); values.push(price) }
    if (price_value !== undefined) { sets.push('price_value = ?'); values.push(price_value) }
    if (currency !== undefined) { sets.push('currency = ?'); values.push(currency) }
    if (notes !== undefined) { sets.push('notes = ?'); values.push(notes) }
    if (target_price !== undefined) { sets.push('target_price = ?'); values.push(target_price) }
    if (is_favorite !== undefined) { sets.push('is_favorite = ?'); values.push(is_favorite ? 1 : 0) }
    if (is_purchased !== undefined) { 
      sets.push('is_purchased = ?'); values.push(is_purchased ? 1 : 0)
      if (is_purchased) { sets.push('purchased_at = ?'); values.push(now) } else { sets.push('purchased_at = NULL') }
    }
    if (position !== undefined) { sets.push('position = ?'); values.push(position) }
    sets.push('updated_at = ?'); values.push(now)
    values.push(req.params.id, req.user.id)
    const result = db.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ? AND user_id = ? AND is_deleted = 0`).run(...values)
    if (result.changes === 0) return res.status(404).json({ error: 'Item no encontrado' })
    
    // Add to price history if price changed
    if (price !== undefined || price_value !== undefined) {
      const item = db.prepare('SELECT price, price_value, currency FROM items WHERE id = ?').get(req.params.id)
      const last = db.prepare('SELECT * FROM price_history WHERE item_id = ? ORDER BY recorded_at DESC LIMIT 1').get(req.params.id)
      if (!last || last.price_value !== item.price_value || last.price !== item.price) {
        const phId = uuidv4()
        db.prepare('INSERT INTO price_history (id, item_id, price, price_value, currency, recorded_at) VALUES (?, ?, ?, ?, ?, ?)').run(phId, req.params.id, item.price, item.price_value, item.currency, now)
      }
    }
    
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)
    res.json(rowToItem(item))
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar item' })
  }
})

router.delete('/:id', (req, res) => {
  try {
    const now = Date.now()
    const result = db.prepare('UPDATE items SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(now, now, req.params.id, req.user.id)
    if (result.changes === 0) return res.status(404).json({ error: 'Item no encontrado' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar item' })
  }
})

router.post('/:id/restore', (req, res) => {
  try {
    const now = Date.now()
    const result = db.prepare('UPDATE items SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?').run(now, req.params.id, req.user.id)
    if (result.changes === 0) return res.status(404).json({ error: 'Item no encontrado' })
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)
    res.json(rowToItem(item))
  } catch (e) {
    res.status(500).json({ error: 'Error al restaurar item' })
  }
})

router.delete('/:id/permanent', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
    if (result.changes === 0) return res.status(404).json({ error: 'Item no encontrado' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar permanentemente' })
  }
})

router.get('/:id/history', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM price_history WHERE item_id = ? ORDER BY recorded_at ASC').all(req.params.id)
    res.json(history)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener historial' })
  }
})

router.post('/bulk', (req, res) => {
  try {
    const { action, ids, collection_id } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs requeridos' })
    const now = Date.now()
    const placeholders = ids.map(() => '?').join(',')
    if (action === 'move') {
      db.prepare(`UPDATE items SET collection_id = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(collection_id || null, now, ...ids, req.user.id)
    } else if (action === 'purchase') {
      db.prepare(`UPDATE items SET is_purchased = 1, purchased_at = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(now, now, ...ids, req.user.id)
    } else if (action === 'unpurchase') {
      db.prepare(`UPDATE items SET is_purchased = 0, purchased_at = NULL, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(now, ...ids, req.user.id)
    } else if (action === 'delete') {
      db.prepare(`UPDATE items SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(now, now, ...ids, req.user.id)
    } else if (action === 'favorite') {
      db.prepare(`UPDATE items SET is_favorite = 1, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(now, ...ids, req.user.id)
    } else if (action === 'unfavorite') {
      db.prepare(`UPDATE items SET is_favorite = 0, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(now, ...ids, req.user.id)
    }
    res.json({ ok: true, count: ids.length })
  } catch (e) {
    res.status(500).json({ error: 'Error en acción masiva' })
  }
})

export default router
