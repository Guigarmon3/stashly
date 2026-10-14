import { getSession } from '../lib/auth.js'

export function requireAuth(req, res, next) {
  const token = req.cookies?.stashly_session
  const session = getSession(token)
  if (!session) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  req.user = { id: session.user_id, email: session.email }
  next()
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.stashly_session
  const session = getSession(token)
  if (session) {
    req.user = { id: session.user_id, email: session.email }
  }
  next()
}
