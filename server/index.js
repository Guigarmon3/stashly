import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

import authRoutes from './routes/auth.js'
import collectionsRoutes from './routes/collections.js'
import itemsRoutes from './routes/items.js'
import syncRoutes from './routes/sync.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/collections', collectionsRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/sync', syncRoutes)

// Serve static files in production
const distPath = join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Stashly running on http://localhost:${PORT}`)
})
