import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor de errores globales
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si el middleware del backend nos devuelve 402, redirigimos a billing
        if (error.response && error.response.status === 402) {
            window.location.href = '/billing';
        }
        
        // Error de autenticación (401)
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Interceptor para inyectar el token de Sanctum
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('kuadre_auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
