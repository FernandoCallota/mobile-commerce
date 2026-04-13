import { authAPI } from './api.js';
import { fetchWithNetworkHint, toUserFacingApiError } from '../utils/apiNetworkError.js';

const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/api';
    }
    if (/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
        return `${protocol}//${hostname}:3000/api`;
    }
    return '/api';
};

const API_URL = getApiUrl();

const getToken = () => localStorage.getItem('token');

const handle403 = async (response) => {
    if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message === 'Token expirado' || errorData.message === 'Token inválido') {
            authAPI.logout();
            window.dispatchEvent(new CustomEvent('tokenExpired'));
            throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
    }
};

async function fetchOrder(url, options) {
    try {
        return await fetchWithNetworkHint(url, options);
    } catch (e) {
        throw toUserFacingApiError(e);
    }
}

export const orderAPI = {
    uploadPaymentProof: async (file) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetchOrder(`${API_URL}/orders/payment-proof`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'include',
            body: formData,
        });
        await handle403(response);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Error al subir comprobante');
        }
        return response.json();
    },

    create: async (payload) => {
        const token = getToken();
        const response = await fetchOrder(`${API_URL}/orders`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });
        await handle403(response);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Error al crear pedido');
        }
        return response.json();
    },

    listMine: async () => {
        const token = getToken();
        const response = await fetchOrder(`${API_URL}/orders`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        await handle403(response);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Error al listar pedidos');
        }
        return response.json();
    },

    cancel: async (id) => {
        const token = getToken();
        const response = await fetchOrder(`${API_URL}/orders/${id}/cancel`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        await handle403(response);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'No se pudo cancelar el pedido');
        }
        return response.json();
    },

    confirmDelivery: async (id) => {
        const token = getToken();
        const response = await fetchOrder(`${API_URL}/orders/${id}/confirm-delivery`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        await handle403(response);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'No se pudo confirmar la entrega');
        }
        return response.json();
    },
};

export default orderAPI;
