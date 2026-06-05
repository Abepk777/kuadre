import Dexie from 'dexie';

export const db = new Dexie('KuadreDB');

db.version(1).stores({
    // Inventario local para ventas offline
    products: 'id, name, stock',
    
    // Base de datos de clientes para autocompletado rápido
    customers: 'id_number, name, phone',
    
    // Cola de ventas pendientes por subir al servidor
    sales_queue: '++id, status, created_at',
    
    // Configuración general y tasas de cambio (singleton key = 'config')
    app_state: 'id'
});
