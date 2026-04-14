/** Umbral para considerar stock bajo (alertas admin / kardex). */
export const LOW_STOCK_THRESHOLD = 20

export function isLowStock(stock) {
    if (stock === undefined || stock === null || stock === '') return false
    const n = Number(stock)
    return !Number.isNaN(n) && n < LOW_STOCK_THRESHOLD
}

/** Cliente (detalle producto): sin stock | pocas unidades | stock suficiente */
export function getClientStockVariant(stock) {
    if (stock === undefined || stock === null || stock === '') return null
    const n = Number(stock)
    if (!Number.isFinite(n) || Number.isNaN(n)) return null
    if (n === 0) return 'out'
    if (n < LOW_STOCK_THRESHOLD) return 'low'
    return 'ok'
}
