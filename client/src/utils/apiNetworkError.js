/**
 * Cuando el backend no está en marcha o el proxy falla, `fetch` lanza TypeError
 * ("Failed to fetch") y el usuario solo ve un error críptico. Centralizamos el mensaje aquí.
 */
export const API_UNAVAILABLE_MESSAGE =
    'No hay conexión con el servidor. En desarrollo: abre otra terminal, entra en la carpeta `server` y ejecuta `npm run dev` (API en el puerto 3000). Deja también el front en marcha (`npm run dev` en `client`).'

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isLikelyNetworkFailure(error) {
    if (error == null) return false
    if (error instanceof TypeError) {
        const m = String(error.message || '').toLowerCase()
        if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
            return true
        }
    }
    return false
}

/**
 * @param {unknown} error
 * @returns {Error}
 */
export function toUserFacingApiError(error) {
    if (isLikelyNetworkFailure(error)) {
        return new Error(API_UNAVAILABLE_MESSAGE)
    }
    return error instanceof Error ? error : new Error(String(error))
}

/**
 * Igual que `fetch`, pero si falla la red devuelve un error con mensaje útil.
 * @param {RequestInfo | URL} url
 * @param {RequestInit} [init]
 */
export async function fetchWithNetworkHint(url, init) {
    try {
        return await fetch(url, init)
    } catch (e) {
        throw toUserFacingApiError(e)
    }
}
