import { authAPI } from './api.js';

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

    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
        throw new Error(error.message || 'Error en la petición');
    }

    return response.json();
};

// API de Kardex
export const kardexAPI = {
    getAll: async (filters = {}) => {
        const queryParams = new URLSearchParams();
        if (filters.productId) queryParams.append('productId', filters.productId);
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.date) queryParams.append('date', filters.date);
        
        const query = queryParams.toString();
        return fetchWithAuth(`/kardex${query ? `?${query}` : ''}`);
    },

    getById: async (id) => {
        return fetchWithAuth(`/kardex/${id}`);
    },

    create: async (kardexData) => {
        return fetchWithAuth('/kardex', {
            method: 'POST',
            body: JSON.stringify(kardexData),
        });
    },

    delete: async (id) => {
        return fetchWithAuth(`/kardex/${id}`, {
            method: 'DELETE',
        });
    },

    getStockSummary: async () => {
        return fetchWithAuth('/kardex/summary');
    },
};

export default kardexAPI;

