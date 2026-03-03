// 🧪 Test de Comunicación Frontend-Backend
// Para ejecutar en la consola del navegador en modo desarrollo

async function testComunicacion() {
    console.log('🚀 Iniciando test de comunicación Frontend-Backend...');
    
    // Verificar si estamos en modo Tauri
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    console.log('📱 Modo Tauri:', isTauri ? '✅ Activo' : '❌ Inactivo');
    
    if (!isTauri) {
        console.log('⚠️ Este test debe ejecutarse en modo desktop (tauri dev)');
        return;
    }
    
    try {
        // Importar API de Tauri
        const { invoke } = await import('@tauri-apps/api/core');
        
        console.log('📋 Probando comandos disponibles...');
        
        // Test 1: Obtener productos (comando legacy)
        console.log('1️⃣ Test: obtener_productos');
        try {
            const productos = await invoke('obtener_productos');
            console.log('✅ obtener_productos - Success:', productos?.length || 0, 'productos');
        } catch (error) {
            console.error('❌ obtener_productos - Error:', error);
        }
        
        // Test 2: Obtener inventario (comando nuevo)
        console.log('2️⃣ Test: get_inventory');
        try {
            const inventory = await invoke('get_inventory');
            console.log('✅ get_inventory - Success:', inventory?.length || 0, 'items');
        } catch (error) {
            console.error('❌ get_inventory - Error:', error);
        }
        
        // Test 3: Dashboard stats
        console.log('3️⃣ Test: get_dashboard_stats');
        try {
            const stats = await invoke('get_dashboard_stats');
            console.log('✅ get_dashboard_stats - Success:', stats);
        } catch (error) {
            console.error('❌ get_dashboard_stats - Error:', error);
        }
        
        // Test 4: Exportar a Excel
        console.log('4️⃣ Test: export_to_excel');
        try {
            const excelData = await invoke('export_to_excel', { reportType: 'inventory' });
            console.log('✅ export_to_excel - Success:', excelData?.length || 0, 'bytes');
        } catch (error) {
            console.error('❌ export_to_excel - Error:', error);
        }
        
        // Test 5: Exportar a PDF
        console.log('5️⃣ Test: export_to_pdf');
        try {
            const pdfData = await invoke('export_to_pdf', { reportType: 'inventory' });
            console.log('✅ export_to_pdf - Success:', pdfData?.length || 0, 'bytes');
        } catch (error) {
            console.error('❌ export_to_pdf - Error:', error);
        }
        
        // Test 6: Obtener compras
        console.log('6️⃣ Test: get_purchases');
        try {
            const purchases = await invoke('get_purchases');
            console.log('✅ get_purchases - Success:', purchases?.length || 0, 'compras');
        } catch (error) {
            console.error('❌ get_purchases - Error:', error);
        }
        
        // Test 7: Obtener movimientos
        console.log('7️⃣ Test: get_movements');
        try {
            const movements = await invoke('get_movements');
            console.log('✅ get_movements - Success:', movements?.length || 0, 'movimientos');
        } catch (error) {
            console.error('❌ get_movements - Error:', error);
        }
        
        // Test 8: Configuración del sistema
        console.log('8️⃣ Test: get_system_settings');
        try {
            const settings = await invoke('get_system_settings');
            console.log('✅ get_system_settings - Success:', settings);
        } catch (error) {
            console.error('❌ get_system_settings - Error:', error);
        }
        
        console.log('🎉 Test completado! Revisa los resultados arriba.');
        
    } catch (error) {
        console.error('💥 Error crítico en test:', error);
    }
}

// Función para verificar comandos disponibles
async function listarComandosDisponibles() {
    console.log('📋 Listando comandos disponibles...');
    
    const comandos = [
        'obtener_productos', 'agregar_producto', 'actualizar_producto', 'eliminar_producto',
        'get_inventory', 'create_inventory_item', 'update_inventory_item', 'delete_inventory_item',
        'get_purchases', 'create_purchase', 'update_purchase', 'delete_purchase', 'get_purchase_by_id',
        'get_movements', 'create_movement_exit', 'create_movement_return', 'create_direct_entry', 'delete_movement',
        'get_movement_statistics',
        'get_reports', 'get_dashboard_stats', 'export_to_excel', 'export_to_pdf',
        'get_system_settings', 'update_system_settings',
        'login', 'signup', 'logout',
        'exportar_a_csv', 'abrir_carpeta_documentos', 'guardar_backup', 'generar_reporte_inventario'
    ];
    
    const { invoke } = await import('@tauri-apps/api/core');
    
    for (const comando of comandos) {
        try {
            await invoke(comando);
            console.log(`✅ ${comando} - Disponible`);
        } catch (error) {
            if (error.message.includes('not found') || error.message.includes('unresolved')) {
                console.log(`❌ ${comando} - No encontrado`);
            } else {
                console.log(`⚠️ ${comando} - Error: ${error.message}`);
            }
        }
    }
}

// Exportar para uso en consola
window.testComunicacion = testComunicacion;
window.listarComandosDisponibles = listarComandosDisponibles;

console.log('🧪 Test de comunicación cargado. Ejecuta:');
console.log('  testComunicacion() - Para test completo');
console.log('  listarComandosDisponibles() - Para listar comandos');
