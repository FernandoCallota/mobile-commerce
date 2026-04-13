import { authAPI } from './api.js';
import { fetchWithNetworkHint, toUserFacingApiError } from '../utils/apiNetworkError.js';

// Detectar la URL base de la API automáticamente
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
            credentials: 'include',
        });
    } catch (e) {
        throw toUserFacingApiError(e);
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
        throw new Error(error.message || 'Error en la petición');
    }

    return response.json();
};

// API de Productos (Admin)
export const productAPI = {
    getAll: async () => {
        return fetchWithAuth('/products');
    },

    getById: async (id) => {
        return fetchWithAuth(`/products/${id}`);
    },

    create: async (productData) => {
        return fetchWithAuth('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    },

    update: async (id, productData) => {
        return fetchWithAuth(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        });
    },

    delete: async (id) => {
        return fetchWithAuth(`/products/${id}`, {
            method: 'DELETE',
        });
    },

    // Subir imagen (para productos)
    uploadImage: async (file, type = 'products') => {
        const token = getToken();
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', type); // Tipo de carpeta: 'products', 'payments', 'orders', 'users'

        let response;
        try {
            response = await fetchWithNetworkHint(`${API_URL}/upload/image?type=${type}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: formData,
            });
        } catch (e) {
            throw toUserFacingApiError(e);
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Error al subir imagen' }));
            throw new Error(error.message || 'Error al subir imagen');
        }

        return response.json();
    },
};

export default productAPI;

