import { authAPI } from './api.js';
import { fetchWithNetworkHint, toUserFacingApiError } from '../utils/apiNetworkError.js';

// Usar la misma lógica de detección de API URL
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

// Función para obtener el token del localStorage
const getToken = () => {
    return localStorage.getItem('token');
};

// Función para hacer peticiones con autenticación
const fetchWithAuth = async (url, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetchWithNetworkHint(`${API_URL}${url}`, {
            ...options,
            headers,
        });
    } catch (e) {
        throw toUserFacingApiError(e);
    }

    // Si el token expiró (403), cerrar sesión automáticamente
    if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message === 'Token expirado' || errorData.message === 'Token inválido') {
            authAPI.logout();
            // Disparar evento personalizado para que App.jsx lo capture
            window.dispatchEvent(new CustomEvent('tokenExpired'));
            throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
        throw new Error(error.message || 'Error en la petición');
    }

    return response.json();
};

// API de Administración
export const adminAPI = {
    // Usuarios
    getAllUsers: async () => {
        return fetchWithAuth('/admin/users');
    },

    getUserById: async (id) => {
        return fetchWithAuth(`/admin/users/${id}`);
    },

    createUser: async (userData) => {
        return fetchWithAuth('/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    updateUser: async (id, userData) => {
        return fetchWithAuth(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    },

    deleteUser: async (id) => {
        return fetchWithAuth(`/admin/users/${id}`, {
            method: 'DELETE',
        });
    },

    getOrders: async () => {
        return fetchWithAuth('/admin/orders');
    },

    getOrder: async (id) => {
        return fetchWithAuth(`/admin/orders/${id}`);
    },

    updateOrderStatus: async (id, status) => {
        return fetchWithAuth(`/admin/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    getContactTickets: async (params) => {
        const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
        return fetchWithAuth(`/admin/contact-tickets${q}`);
    },

    getContactTicket: async (id) => {
        return fetchWithAuth(`/admin/contact-tickets/${id}`);
    },

    updateContactTicket: async (id, body) => {
        return fetchWithAuth(`/admin/contact-tickets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    },
};

export default adminAPI;

