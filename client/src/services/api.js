import {
    API_UNAVAILABLE_MESSAGE,
    isLikelyNetworkFailure,
    toUserFacingApiError,
    fetchWithNetworkHint,
} from '../utils/apiNetworkError.js';

// Detectar la URL base de la API automáticamente
export const getApiUrl = () => {
    // Si hay una variable de entorno, usarla
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Si estamos en localhost o 127.0.0.1, usar ruta relativa (proxy de Vite)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/api';
    }
    
    // Si estamos en una IP de red local (192.168.x.x, 10.x.x.x, etc.), usar esa IP con puerto 3000
    // Esto permite que funcione desde el celular
    if (/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
        return `${protocol}//${hostname}:3000/api`;
    }
    
    // Por defecto, usar ruta relativa
    return '/api';
};

const API_URL = getApiUrl();

/**
 * URL para usar en <img src>: sirve imágenes de Cloudinary vía /api/images/proxy
 * para evitar solicitudes directas a res.cloudinary.com (cookies de terceros / Lighthouse).
 * No usar para guardar en BD; solo para mostrar.
 */
export function displayImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (!url.toLowerCase().includes('res.cloudinary.com')) return url;
    const base = getApiUrl();
    return `${base}/images/proxy?url=${encodeURIComponent(url)}`;
}

// Función para obtener el token del localStorage
const getToken = () => {
    return localStorage.getItem('token');
};

// Función para verificar si el token está expirado
const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
        // Decodificar el token sin verificar (solo para obtener la expiración)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convertir a milisegundos
        const now = Date.now();
        return now >= exp;
    } catch (error) {
        return true; // Si hay error al decodificar, considerarlo expirado
    }
};

// Callback para cuando el token expire
let onTokenExpired = null;

// Función para registrar callback de expiración
export const setTokenExpiredCallback = (callback) => {
    onTokenExpired = callback;
};

// Función para refrescar el token de acceso
const refreshAccessToken = async () => {
    try {
        const response = await fetchWithNetworkHint(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include', // Incluir cookies (refresh token)
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('No se pudo refrescar el token');
        }

        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            return data.token;
        }
        throw new Error('Token no recibido');
    } catch (error) {
        // Sin API en marcha: no cerrar sesión por un fallo de red
        if (isLikelyNetworkFailure(error) || error?.message === API_UNAVAILABLE_MESSAGE) {
            throw error instanceof Error ? error : toUserFacingApiError(error);
        }
        authAPI.logout();
        if (onTokenExpired) {
            onTokenExpired();
        }
        throw error;
    }
};

// Función para hacer peticiones con autenticación
const fetchWithAuth = async (url, options = {}, retry = true) => {
    let token = getToken();

    // Verificar si el token está expirado antes de hacer la petición
    if (token && isTokenExpired(token)) {
        try {
            token = await refreshAccessToken();
        } catch (error) {
            if (error?.message === API_UNAVAILABLE_MESSAGE || isLikelyNetworkFailure(error)) {
                throw toUserFacingApiError(error);
            }
            throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
    }

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
            credentials: 'include', // Incluir cookies en todas las peticiones
        });
    } catch (e) {
        throw toUserFacingApiError(e);
    }

    // Si el token expiró (403), intentar refrescar una vez
    if (response.status === 403 && retry) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message === 'Token expirado' || errorData.message === 'Token inválido') {
            try {
                const newToken = await refreshAccessToken();
                headers['Authorization'] = `Bearer ${newToken}`;

                const retryResponse = await fetchWithNetworkHint(`${API_URL}${url}`, {
                    ...options,
                    headers,
                    credentials: 'include',
                });

                if (!retryResponse.ok) {
                    throw new Error('Error después de refrescar token');
                }

                return retryResponse.json();
            } catch (error) {
                if (error?.message === API_UNAVAILABLE_MESSAGE || isLikelyNetworkFailure(error)) {
                    throw toUserFacingApiError(error);
                }
                throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            }
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
        throw new Error(error.message || 'Error en la petición');
    }

    return response.json();
};

// API de Autenticación
export const authAPI = {
    register: async (userData) => {
        const response = await fetchWithNetworkHint(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Incluir cookies para refresh token
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
            throw new Error(error.message || 'Error en la petición');
        }

        const data = await response.json();
        
        // Guardar token en localStorage
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data;
    },

    login: async (email, password) => {
        const response = await fetchWithNetworkHint(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Incluir cookies para refresh token
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
            throw new Error(error.message || 'Error en la petición');
        }

        const data = await response.json();
        
        // Guardar token en localStorage
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data;
    },

    refreshToken: async () => {
        return refreshAccessToken();
    },

    getProfile: async () => {
        return fetchWithAuth('/auth/profile');
    },

    updateProfile: async (payload) => {
        return fetchWithAuth('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    changePassword: async (currentPassword, newPassword) => {
        return fetchWithAuth('/auth/password', {
            method: 'PATCH',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    logout: async () => {
        try {
            await fetchWithNetworkHint(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor:', error);
        } finally {
            // Limpiar localStorage siempre
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    },

    isAuthenticated: () => {
        return !!getToken();
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Verificar si el token está expirado y refrescarlo si es necesario
    checkTokenExpiration: async () => {
        const token = getToken();
        if (!token) {
            return false;
        }
        
        if (isTokenExpired(token)) {
            try {
                await refreshAccessToken();
                return false;
            } catch (error) {
                if (error?.message === API_UNAVAILABLE_MESSAGE || isLikelyNetworkFailure(error)) {
                    return false;
                }
                authAPI.logout();
                if (onTokenExpired) {
                    onTokenExpired();
                }
                return true;
            }
        }
        return false;
    }
};

// API de Productos
export const productsAPI = {
    getAll: async () => {
        return fetchWithAuth('/products');
    },

    getById: async (id) => {
        return fetchWithAuth(`/products/${id}`);
    }
};

export default {
    auth: authAPI,
    products: productsAPI,
};

