import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'
import db from '../lib/db.js'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  const collections = db.prepare('SELECT * FROM collections WHERE user_id = ? ORDER BY position ASC, created_at ASC').all(req.user.id)
  res.json(collections.map(c => ({ ...c, collapsed: !!c.collapsed })))
})

router.post('/', (req, res) => {
  try {
    const { name, color, icon } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    const id = uuidv4()
    const now = Date.now()
    const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM collections WHERE user_id = ?').get(req.user.id)
    db.prepare('INSERT INTO collections (id, user_id, name, color, icon, position, collapsed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)').run(id, req.user.id, name.trim(), color || null, icon || null, maxPos.pos, now, now)
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id)
    res.json({ ...collection, collapsed: false })
  } catch (e) {
    res.status(500).json({ error: 'Error al crear carpeta' })
  }
})

router.put('/:id', (req, res) => {
  try {
    const { name, color, icon, position, collapsed } = req.body
    const now = Date.now()
    const sets = []
    const values = []
    if (name !== undefined) { sets.push('name = ?'); values.push(name.trim()) }
    if (color !== undefined) { sets.push('color = ?'); values.push(color) }
    if (icon !== undefined) { sets.push('icon = ?'); values.push(icon) }
    if (position !== undefined) { sets.push('position = ?'); values.push(position) }
    if (collapsed !== undefined) { sets.push('collapsed = ?'); values.push(collapsed ? 1 : 0) }
    sets.push('updated_at = ?'); values.push(now)
    values.push(req.params.id, req.user.id)
    const result = db.prepare(`UPDATE collections SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
    if (result.changes === 0) return res.status(404).json({ error: 'Carpeta no encontrada' })
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(req.params.id)
    res.json({ ...collection, collapsed: !!collection.collapsed })
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar carpeta' })
  }
})

router.delete('/:id', (req, res) => {
  try {
    // Move items to no collection
    db.prepare('UPDATE items SET collection_id = NULL, updated_at = ? WHERE collection_id = ? AND user_id = ?').run(Date.now(), req.params.id, req.user.id)
    const result = db.prepare('DELETE FROM collections WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
    if (result.changes === 0) return res.status(404).json({ error: 'Carpeta no encontrada' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar carpeta' })
  }
})

export default router
