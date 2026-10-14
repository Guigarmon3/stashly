import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(join(dataDir, 'stashly.db'))
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
db.exec("CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL)")
db.exec("CREATE TABLE IF NOT EXISTS collections(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,color TEXT,icon TEXT,position INTEGER DEFAULT 0,collapsed INTEGER DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)")
db.exec("CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,collection_id TEXT,url TEXT NOT NULL,title TEXT,image TEXT,price TEXT,price_value REAL,currency TEXT,store TEXT,notes TEXT,target_price REAL,target_price_currency TEXT,is_favorite INTEGER DEFAULT 0,is_purchased INTEGER DEFAULT 0,is_deleted INTEGER DEFAULT 0,position INTEGER DEFAULT 0,added_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,purchased_at INTEGER,deleted_at INTEGER,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE SET NULL)")
db.exec("CREATE TABLE IF NOT EXISTS price_history(id TEXT PRIMARY KEY,item_id TEXT NOT NULL,price TEXT,price_value REAL,currency TEXT,recorded_at INTEGER NOT NULL,FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE)")
db.exec("CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)")
db.exec("CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id)")
db.exec("CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection_id)")
db.exec("CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)")
db.exec("CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_id)")
export default db
