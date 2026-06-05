import { useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import api from '../lib/axios';

export function useSync() {
    const syncSalesQueue = useCallback(async () => {
        if (!navigator.onLine) return;

        try {
            // Get all pending sales
            const pendingSales = await db.sales_queue.where('status').equals('pending').toArray();
            
            if (pendingSales.length === 0) return;

            // Enviar al servidor de forma masiva
            const tenant = JSON.parse(localStorage.getItem('kuadre_tenant'));
            if (!tenant) return;

            const response = await api.post(`/${tenant.id}/sales/bulk`, { sales: pendingSales });

            if (response.data.status === 'success') {
                // Borrar las ventas exitosas de la cola local
                const idsToDelete = pendingSales.map(sale => sale.id);
                await db.sales_queue.bulkDelete(idsToDelete);
            }
        } catch (error) {
            console.error('[Sync Error] Fallo al sincronizar ventas offline:', error);
        }
    }, []);

    useEffect(() => {
        // Escuchar cuando la conexión vuelve para sincronizar de inmediato
        const handleOnline = () => {
            syncSalesQueue();
        };

        window.addEventListener('online', handleOnline);

        // Intentar sincronizar cuando el hook se monta (al abrir la app)
        syncSalesQueue();

        // Opcional: configurar un intervalo de reintento cada 3 minutos si falla
        const interval = setInterval(() => {
            syncSalesQueue();
        }, 180000);

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, [syncSalesQueue]);

    return { triggerSync: syncSalesQueue };
}
