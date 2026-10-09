import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword, verifyPassword, createSession, deleteSession } from '../lib/auth.js'
import { requireAuth } from '../middleware/auth.js'
import db from '../lib/db.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' })
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
    if (existing) return res.status(400).json({ error: 'Este email ya está registrado' })
    
    const userId = uuidv4()
    const passwordHash = await hashPassword(password)
    db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(userId, email.toLowerCase(), passwordHash, Date.now())
    
    // Create default collection
    const collId = uuidv4()
    db.prepare('INSERT INTO collections (id, user_id, name, position, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)').run(collId, userId, 'Mi lista', Date.now(), Date.now())
    
    const { sessionId, expiresAt } = createSession(userId)
    res.cookie('stashly_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: expiresAt - Date.now(),
      path: '/'
    })
    res.json({ user: { id: userId, email: email.toLowerCase() } })
  } catch (e) {
    res.status(500).json({ error: 'Error al registrar' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' })
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase())
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })
    
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' })
    
    const { sessionId, expiresAt } = createSession(user.id)
    res.cookie('stashly_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: expiresAt - Date.now(),
      path: '/'
    })
    res.json({ user: { id: user.id, email: user.email } })
  } catch (e) {
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

router.post('/logout', requireAuth, (req, res) => {
  const token = req.cookies?.stashly_session
  if (token) deleteSession(token)
  res.clearCookie('stashly_session')
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
