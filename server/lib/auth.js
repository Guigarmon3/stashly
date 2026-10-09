import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import db from './db.js'
const S = 30
export async function hashPassword(p) { return bcrypt.hash(p, 12) }
export async function verifyPassword(p, h) { return bcrypt.compare(p, h) }
export function createSession(u) { const sid = uuidv4(); const e = Date.now() + S * 86400000; db.prepare('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(sid, u, e, Date.now()); return { sessionId: sid, expiresAt: e } }
export function getSession(sid) { if (!sid) return null; const r = db.prepare('SELECT s.*,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?').get(sid, Date.now()); return r || null }
export function deleteSession(sid) { db.prepare('DELETE FROM sessions WHERE id=?').run(sid) }
export function cleanExpiredSessions() { try { db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now()) } catch (e) {} }
setInterval(cleanExpiredSessions, 3600000)
cleanExpiredSessions()
