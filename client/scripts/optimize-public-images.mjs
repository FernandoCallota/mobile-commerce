/**
 * Genera .webp optimizados en public/assets (ejecutar: npm run optimize-images).
 * Requiere: npm install (sharp en devDependencies).
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicAssets = path.join(__dirname, '../public/assets')

async function toWebp(rel, { maxWidth, quality = 82 } = {}) {
    const input = path.join(publicAssets, rel)
    if (!fs.existsSync(input)) {
        console.warn('[optimize-images] omitido (no existe):', rel)
        return
    }
    const outRel = rel.replace(/\.(png|jpg|jpeg)$/i, '.webp')
    const output = path.join(publicAssets, outRel)
    let pipeline = sharp(input)
    if (maxWidth) {
        pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true })
    }
    await pipeline.webp({ quality, effort: 6 }).toFile(output)
    const a = fs.statSync(input).size
    const b = fs.statSync(output).size
    console.log(`OK ${rel} → ${outRel} (${(a / 1024).toFixed(0)} KiB → ${(b / 1024).toFixed(0)} KiB)`)
}

await toWebp('baner.png', { maxWidth: 1280, quality: 84 })
await toWebp('carrusel1.jpg', { maxWidth: 960, quality: 84 })
await toWebp('carrusel2.jpg', { maxWidth: 960, quality: 84 })
await toWebp('socios/vitamax.jpg', { maxWidth: 360, quality: 82 })
await toWebp('socios/romi.jpg', { maxWidth: 360, quality: 82 })
await toWebp('socios/purina.png', { maxWidth: 400, quality: 86 })

console.log('Listo.')
