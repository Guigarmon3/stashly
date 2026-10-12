import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import db from '../lib/db.js'

const router = Router()
router.use(requireAuth)

router.get('/export', (req, res) => {
  try {
    const collections = db.prepare('SELECT * FROM collections WHERE user_id = ?').all(req.user.id)
    const items = db.prepare('SELECT * FROM items WHERE user_id = ?').all(req.user.id)
    const history = db.prepare(`SELECT ph.* FROM price_history ph JOIN items i ON i.id = ph.item_id WHERE i.user_id = ?`).all(req.user.id)
    res.json({
      version: 1,
      exported_at: Date.now(),
      collections,
      items,
      price_history: history
    })
  } catch (e) {
    res.status(500).json({ error: 'Error al exportar' })
  }
})

router.post('/import', (req, res) => {
  try {
    const { collections = [], items = [], price_history = [] } = req.body
    const now = Date.now()
    const importStmt = db.transaction(() => {
      for (const c of collections) {
        const existing = db.prepare('SELECT id FROM collections WHERE id = ? AND user_id = ?').get(c.id, req.user.id)
        if (existing) {
          db.prepare('UPDATE collections SET name=?, color=?, icon=?, position=?, collapsed=?, updated_at=? WHERE id=? AND user_id=?')
            .run(c.name, c.color, c.icon, c.position || 0, c.collapsed ? 1 : 0, now, c.id, req.user.id)
        } else {
          db.prepare('INSERT INTO collections (id, user_id, name, color, icon, position, collapsed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(c.id, req.user.id, c.name, c.color, c.icon, c.position || 0, c.collapsed ? 1 : 0, c.created_at || now, now)
        }
      }
      for (const it of items) {
        const existing = db.prepare('SELECT id FROM items WHERE id = ? AND user_id = ?').get(it.id, req.user.id)
        if (existing) {
          db.prepare(`UPDATE items SET collection_id=?, url=?, title=?, image=?, price=?, price_value=?, currency=?, store=?, notes=?, target_price=?, is_favorite=?, is_purchased=?, is_deleted=?, position=?, purchased_at=?, deleted_at=?, updated_at=? WHERE id=? AND user_id=?`)
            .run(it.collection_id, it.url, it.title, it.image, it.price, it.price_value, it.currency, it.store, it.notes, it.target_price, it.is_favorite ? 1 : 0, it.is_purchased ? 1 : 0, it.is_deleted ? 1 : 0, it.position || 0, it.purchased_at, it.deleted_at, now, it.id, req.user.id)
        } else {
          db.prepare(`INSERT INTO items (id, user_id, collection_id, url, title, image, price, price_value, currency, store, notes, target_price, is_favorite, is_purchased, is_deleted, position, added_at, updated_at, purchased_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(it.id, req.user.id, it.collection_id, it.url, it.title, it.image, it.price, it.price_value, it.currency, it.store, it.notes, it.target_price, it.is_favorite ? 1 : 0, it.is_purchased ? 1 : 0, it.is_deleted ? 1 : 0, it.position || 0, it.added_at || now, now, it.purchased_at, it.deleted_at)
        }
      }
      for (const h of price_history) {
        const existing = db.prepare('SELECT id FROM price_history WHERE id = ?').get(h.id)
        if (!existing) {
          db.prepare('INSERT INTO price_history (id, item_id, price, price_value, currency, recorded_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(h.id, h.item_id, h.price, h.price_value, h.currency, h.recorded_at || now)
        }
      }
    })
    importStmt()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al importar' })
  }
})

export default router
