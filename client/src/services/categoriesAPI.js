import { getApiUrl } from './api.js';
import { fetchWithNetworkHint, toUserFacingApiError } from '../utils/apiNetworkError.js';

const buildHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

export const categoriesAPI = {
    /** Listado: público ve solo activas; con token admin ve todas */
    getAll: async () => {
        let response;
        try {
            response = await fetchWithNetworkHint(`${getApiUrl()}/categories`, {
                credentials: 'include',
                headers: buildHeaders(),
            });
        } catch (e) {
            throw toUserFacingApiError(e);
        }
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Error al cargar categorías');
        }
        return response.json();
    },

    create: async (body) => {
        let response;
        try {
            response = await fetchWithNetworkHint(`${getApiUrl()}/categories`, {
                method: 'POST',
                credentials: 'include',
                headers: buildHeaders(),
                body: JSON.stringify(body),
            });
        } catch (e) {
            throw toUserFacingApiError(e);
        }
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Error al crear categoría');
        }
        return response.json();
    },

    update: async (id, body) => {
        let response;
        try {
            response = await fetchWithNetworkHint(`${getApiUrl()}/categories/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: buildHeaders(),
                body: JSON.stringify(body),
            });
        } catch (e) {
            throw toUserFacingApiError(e);
        }
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Error al actualizar categoría');
        }
        return response.json();
    },

    remove: async (id) => {
        let response;
        try {
            response = await fetchWithNetworkHint(`${getApiUrl()}/categories/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: buildHeaders(),
            });
        } catch (e) {
            throw toUserFacingApiError(e);
        }
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Error al eliminar categoría');
        }
        return response.json();
    },
};

export default categoriesAPI;
