import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

function parsePrice(text) {
  if (!text) return { price: null, priceValue: null, currency: null }
  const cleaned = text.replace(/\s+/g, ' ').trim()
  // Try to match common price patterns
  const eurMatch = cleaned.match(/([€$£¥]\s*[\d.,]+|\d+[.,]\d+\s*[€$£¥])/i)
  if (eurMatch) {
    const priceStr = eurMatch[1]
    const numMatch = priceStr.match(/[\d]+[.,][\d]{2}|[\d]+/)
    if (numMatch) {
      const numStr = numMatch[0].replace(',', '.')
      const priceValue = parseFloat(numStr)
      const currency = priceStr.includes('€') ? 'EUR' : priceStr.includes('$') ? 'USD' : priceStr.includes('£') ? 'GBP' : null
      return { price: priceStr.trim(), priceValue, currency }
    }
    return { price: priceStr.trim(), priceValue: null, currency: null }
  }
  // Just numbers
  const numMatch = cleaned.match(/([\d]{1,4}[.,][\d]{2})/)
  if (numMatch) {
    return { price: numMatch[1], priceValue: parseFloat(numMatch[1].replace(',', '.')), currency: null }
  }
  return { price: null, priceValue: null, currency: null }
}

function getStore(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    return hostname
  } catch {
    return null
  }
}

export async function scrapeUrl(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Try JSON-LD Product
    let title = null, image = null, price = null, priceValue = null, currency = null
    
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const json = JSON.parse($(el).html())
        const data = Array.isArray(json) ? json.find(x => x['@type'] === 'Product') || json[0] : json
        if (data && data['@type'] === 'Product') {
          if (data.name && !title) title = data.name
          if (data.image && !image) {
            image = Array.isArray(data.image) ? data.image[0] : (typeof data.image === 'object' ? data.image.url : data.image)
          }
          if (data.offers) {
            const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers
            if (offer.price && !price) {
              price = offer.price + (offer.priceCurrency ? ' ' + offer.priceCurrency : '')
              priceValue = parseFloat(offer.price)
              currency = offer.priceCurrency
            }
          }
        }
      } catch {}
    })
    
    // Fallbacks
    if (!title) title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || $('title').text()
    if (!image) image = $('meta[property="og:image"]').attr('content') || $('meta[property="og:image:secure_url"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || $('meta[name="twitter:image:src"]').attr('content')
    if (!price) {
      // Common selectors
      const priceSelectors = ['[itemprop="price"]', '.price', '#priceblock_ourprice', '#priceblock_dealprice', '.a-price .a-offscreen', '[data-price]', '.product-price']
      for (const sel of priceSelectors) {
        const el = $(sel).first()
        if (el.length) {
          const text = el.attr('content') || el.text()
          const parsed = parsePrice(text)
          if (parsed.price) { price = parsed.price; priceValue = parsed.priceValue; currency = parsed.currency; break }
        }
      }
    }
    
    if (title) title = title.trim().substring(0, 500)
    if (image && image.startsWith('//')) image = 'https:' + image
    if (image && image.startsWith('/')) {
      try {
        const base = new URL(url)
        image = base.origin + image
      } catch {}
    }
    
    return {
      url,
      title: title || null,
      image: image || null,
      price: price || null,
      priceValue: priceValue || null,
      currency: currency || null,
      store: getStore(url)
    }
  } catch (error) {
    return {
      url,
      title: null,
      image: null,
      price: null,
      priceValue: null,
      currency: null,
      store: getStore(url)
    }
  }
}
