import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';
import { db } from '../lib/db';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('kuadre_auth_token');
        const storedUser = localStorage.getItem('kuadre_user');
        const storedTenant = localStorage.getItem('kuadre_tenant');
        const storedRates = localStorage.getItem('kuadre_rates');
        
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
            if(storedTenant) setTenant(JSON.parse(storedTenant));
            if(storedRates) setRates(JSON.parse(storedRates));
        }
        setLoading(false);
    }, []);

    const refreshData = async () => {
        const token = localStorage.getItem('kuadre_auth_token');
        if (!token) return false;
        try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const { data } = await api.get('/auth/me');
            if(data.status === 'success') {
                const meData = data;
                setUser(meData.user);
                setTenant(meData.tenant);
                setRates(meData.rates);

                try {
                    const productsRes = await api.get(`/${meData.tenant.id}/inventory/products`);
                    await db.products.clear();
                    await db.products.bulkPut(productsRes.data.products);
                } catch (err) {
                    console.error("Error syncing local products:", err);
                }

                try {
                    const customersRes = await api.get(`/${meData.tenant.id}/customers`);
                    await db.customers.clear();
                    await db.customers.bulkPut(customersRes.data);
                } catch (err) {
                    console.error("Error syncing local customers:", err);
                }

                localStorage.setItem('kuadre_user', JSON.stringify(meData.user));
                localStorage.setItem('kuadre_tenant', JSON.stringify(meData.tenant));
                localStorage.setItem('kuadre_rates', JSON.stringify(meData.rates));
                return true;
            }
        } catch (error) {
            console.error('Error refreshing data', error);
            return false;
        }
    };

    const login = async (credentials) => {
        try {
            const { data } = await api.post('/auth/login', credentials);
            localStorage.setItem('kuadre_auth_token', data.token);
            localStorage.setItem('kuadre_user', JSON.stringify(data.user));
            if(data.tenant) {
                localStorage.setItem('kuadre_tenant', JSON.stringify(data.tenant));
                setTenant(data.tenant);
            }
            if(data.rates) {
                localStorage.setItem('kuadre_rates', JSON.stringify(data.rates));
                setRates(data.rates);
            }
            setUser(data.user);
            return { success: true, user: data.user };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Error al iniciar sesión' 
            };
        }
    };

    const register = async (userData) => {
        try {
            const { data } = await api.post('/auth/register', userData);
            // Auto login after successful register since the API returns token now!
            if (data.token) {
                localStorage.setItem('kuadre_auth_token', data.token);
                localStorage.setItem('kuadre_user', JSON.stringify(data.user));
                if(data.tenant) {
                    localStorage.setItem('kuadre_tenant', JSON.stringify(data.tenant));
                    setTenant(data.tenant);
                }
                if(data.rates) {
                    localStorage.setItem('kuadre_rates', JSON.stringify(data.rates));
                    setRates(data.rates);
                }
                setUser(data.user);
            }
            return { success: true, message: data.message };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Error en el registro' 
            };
        }
    };

    const logout = async () => {
        // Attempt to sync offline sales before wiping
        try {
            if (navigator.onLine) {
                const pendingSales = await db.sales_queue.where('status').equals('pending').toArray();
                if (pendingSales.length > 0) {
                    const localTenant = JSON.parse(localStorage.getItem('kuadre_tenant'));
                    if (localTenant) {
                        await api.post(`/${localTenant.id}/sales/bulk`, { sales: pendingSales });
                    }
                }
            }
        } catch (e) {
            console.error('[Logout Sync] Failed to sync before logout', e);
        }

        try {
            await api.post('/auth/logout');
        } catch(e) {} // Ignoramos si falla por token expirado

        // Clear everything
        localStorage.clear();
        await db.products.clear();
        await db.customers.clear();
        await db.sales_queue.clear();
        await db.app_state.clear();

        setUser(null);
        setTenant(null);
        setRates(null);
    };

    return (
        <AuthContext.Provider value={{ user, tenant, rates, login, register, logout, refreshData, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
