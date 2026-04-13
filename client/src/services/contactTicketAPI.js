import { authAPI } from './api.js'
import { fetchWithNetworkHint, toUserFacingApiError } from '../utils/apiNetworkError.js'

const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL
    }
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/api'
    }
    if (/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
        return `${protocol}//${hostname}:3000/api`
    }
    return '/api'
}

const API_URL = getApiUrl()
const getToken = () => localStorage.getItem('token')

const handle403 = async (response) => {
    if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.message === 'Token expirado' || errorData.message === 'Token inválido') {
            authAPI.logout()
            window.dispatchEvent(new CustomEvent('tokenExpired'))
            throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
        }
    }
}

async function fetchCt(url, options) {
    try {
        return await fetchWithNetworkHint(url, options)
    } catch (e) {
        throw toUserFacingApiError(e)
    }
}

export const contactTicketAPI = {
    create: async (payload) => {
        const token = getToken()
        const response = await fetchCt(`${API_URL}/contact-tickets`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        })
        await handle403(response)
        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            if (response.status === 401) {
                throw new Error(error.message || 'Debes iniciar sesión para esta acción.')
            }
            throw new Error(error.message || 'No se pudo enviar tu mensaje')
        }
        return response.json()
    },

    listMine: async () => {
        const token = getToken()
        const response = await fetchCt(`${API_URL}/contact-tickets`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        })
        await handle403(response)
        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.message || 'Error al cargar tus consultas')
        }
        return response.json()
    },

    getMine: async (id) => {
        const token = getToken()
        const response = await fetchCt(`${API_URL}/contact-tickets/${id}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        })
        await handle403(response)
        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.message || 'Error al obtener el detalle')
        }
        return response.json()
    },
}

export default contactTicketAPI
