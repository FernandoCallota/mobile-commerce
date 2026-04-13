/** Umbral para considerar stock bajo (alertas admin / kardex). */
export const LOW_STOCK_THRESHOLD = 20

export function isLowStock(stock) {
    if (stock === undefined || stock === null || stock === '') return false
    const n = Number(stock)
    return !Number.isNaN(n) && n < LOW_STOCK_THRESHOLD
}
