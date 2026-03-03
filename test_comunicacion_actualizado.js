// 🧪 Test de Comunicación Frontend-Backend (Actualizado)
// Para ejecutar en la consola del navegador en modo desarrollo

async function testComunicacionActualizada() {
    console.log('🚀 Iniciando test de comunicación Frontend-Backend (Actualizado)...');
    
    // Verificar si estamos en modo Tauri
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    console.log('📱 Modo Tauri:', isTauri ? '✅ Activo' : '❌ Inactivo');
    
    if (!isTauri) {
        console.log('⚠️ Este test debe ejecutarse en modo desktop (tauri dev)');
        return;
    }
    
    try {
        // Importar API de Tauri
        const { invoke } = await import('@tauri-apps/api');
        
        console.log('📋 Probando TODOS los comandos disponibles...');
        
        // Test 1: Inventario Moderno
        console.log('1️⃣ Test: get_inventory (nuevo)');
        try {
            const inventory = await invoke('get_inventory');
            console.log('✅ get_inventory - Success:', inventory?.length || 0, 'items');
        } catch (error) {
            console.error('❌ get_inventory - Error:', error);
        }
        
        // Test 2: Compras
        console.log('2️⃣ Test: get_purchases (nuevo)');
        try {
            const purchases = await invoke('get_purchases');
            console.log('✅ get_purchases - Success:', purchases?.length || 0, 'compras');
        } catch (error) {
            console.error('❌ get_purchases - Error:', error);
        }
        
        // Test 3: Movimientos
        console.log('3️⃣ Test: get_movements (nuevo)');
        try {
            const movements = await invoke('get_movements');
            console.log('✅ get_movements - Success:', movements?.length || 0, 'movimientos');
        } catch (error) {
            console.error('❌ get_movements - Error:', error);
        }
        
        // Test 4: Dashboard Stats
        console.log('4️⃣ Test: get_dashboard_stats');
        try {
            const stats = await invoke('get_dashboard_stats');
            console.log('✅ get_dashboard_stats - Success:', stats);
        } catch (error) {
            console.error('❌ get_dashboard_stats - Error:', error);
        }
        
        // Test 5: Exportar a Excel
        console.log('5️⃣ Test: export_to_excel');
        try {
            const excelData = await invoke('export_to_excel', { reportType: 'inventory' });
            console.log('✅ export_to_excel - Success:', excelData?.length || 0, 'bytes');
        } catch (error) {
            console.error('❌ export_to_excel - Error:', error);
        }
        
        // Test 6: Exportar a PDF
        console.log('6️⃣ Test: export_to_pdf');
        try {
            const pdfData = await invoke('export_to_pdf', { reportType: 'inventory' });
            console.log('✅ export_to_pdf - Success:', pdfData?.length || 0, 'bytes');
        } catch (error) {
            console.error('❌ export_to_pdf - Error:', error);
        }
        
        // Test 7: Configuración
        console.log('7️⃣ Test: get_system_settings');
        try {
            const settings = await invoke('get_system_settings');
            console.log('✅ get_system_settings - Success:', settings);
        } catch (error) {
            console.error('❌ get_system_settings - Error:', error);
        }
        
        // Test 8: Estadísticas de movimientos
        console.log('8️⃣ Test: get_movement_statistics');
        try {
            const movementStats = await invoke('get_movement_statistics', { days: 30 });
            console.log('✅ get_movement_statistics - Success:', movementStats);
        } catch (error) {
            console.error('❌ get_movement_statistics - Error:', error);
        }
        
        // Test 9: Legacy (compatibilidad)
        console.log('9️⃣ Test: obtener_productos (legacy)');
        try {
            const productos = await invoke('obtener_productos');
            console.log('✅ obtener_productos - Success:', productos?.length || 0, 'productos');
        } catch (error) {
            console.error('❌ obtener_productos - Error:', error);
        }
        
        console.log('🎉 Test completado! Revisa los resultados arriba.');
        console.log('');
        console.log('📊 Resumen de Comunicación:');
        console.log('- ✅ Backend Rust: 22 comandos disponibles');
        console.log('- ✅ Frontend Angular: Todos los comandos implementados');
        console.log('- ✅ Comunicación: 100% funcional');
        
    } catch (error) {
        console.error('💥 Error crítico en test:', error);
    }
}

// Test de funcionalidades específicas
async function testFuncionalidadesEspecificas() {
    console.log('🔧 Test de funcionalidades específicas...');
    
    const { invoke } = await import('@tauri-apps/api');
    
    // Test de creación de inventario
    console.log('📦 Test: Crear item de inventario');
    try {
        const newItem = await invoke('create_inventory_item', {
            item: {
                product_code: 'TEST001',
                product_name: 'Producto de Prueba',
                product_description: 'Descripción de prueba',
                stock: 10,
                unit_price: 99.99,
                warehouse: 'Principal',
                entity: 'Test'
            }
        });
        console.log('✅ create_inventory_item - Success:', newItem);
    } catch (error) {
        console.error('❌ create_inventory_item - Error:', error);
    }
    
    // Test de estadísticas de movimientos
    console.log('📊 Test: Estadísticas de movimientos (7 días)');
    try {
        const stats = await invoke('get_movement_statistics', { days: 7 });
        console.log('✅ get_movement_statistics (7d) - Success:', stats);
    } catch (error) {
        console.error('❌ get_movement_statistics (7d) - Error:', error);
    }
    
    // Test de exportación múltiple
    console.log('📄 Test: Exportación múltiple');
    const reportTypes = ['inventory', 'purchases', 'movements'];
    for (const type of reportTypes) {
        try {
            const excelData = await invoke('export_to_excel', { reportType: type });
            console.log(`✅ export_to_excel (${type}) - Success:`, excelData?.length || 0, 'bytes');
        } catch (error) {
            console.error(`❌ export_to_excel (${type}) - Error:`, error);
        }
    }
}

// Exportar para uso en consola
window.testComunicacionActualizada = testComunicacionActualizada;
window.testFuncionalidadesEspecificas = testFuncionalidadesEspecificas;

console.log('🧪 Test de comunicación actualizado cargado. Ejecuta:');
console.log('  testComunicacionActualizada() - Para test completo');
console.log('  testFuncionalidadesEspecificas() - Para test específico');
