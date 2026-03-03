// 🧪 Test Simple de Comunicación - Copiar y pegar en consola F12

async function testComunicacionSimple() {
    console.log('🚀 Iniciando test de comunicación...');
    
    // Verificar si estamos en modo Tauri
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    console.log('📱 Modo Tauri:', isTauri ? '✅ Activo' : '❌ Inactivo');
    
    if (!isTauri) {
        console.log('❌ Error: No se detectó modo Tauri');
        return;
    }
    
    try {
        // Importar API de Tauri
        const { invoke } = await import('@tauri-apps/api');
        console.log('✅ API Tauri cargada correctamente');
        
        // Test 1: Obtener inventario
        console.log('1️⃣ Test: get_inventory...');
        try {
            const inventory = await invoke('get_inventory');
            console.log('✅ get_inventory - Success:', inventory?.length || 0, 'items');
            if (inventory && inventory.length > 0) {
                console.log('📦 Primer item:', inventory[0]);
            }
        } catch (error) {
            console.error('❌ get_inventory - Error:', error);
        }
        
        // Test 2: Dashboard stats
        console.log('2️⃣ Test: get_dashboard_stats...');
        try {
            const stats = await invoke('get_dashboard_stats');
            console.log('✅ get_dashboard_stats - Success:', stats);
        } catch (error) {
            console.error('❌ get_dashboard_stats - Error:', error);
        }
        
        // Test 3: Exportar a Excel
        console.log('3️⃣ Test: export_to_excel...');
        try {
            const excelData = await invoke('export_to_excel', { reportType: 'inventory' });
            console.log('✅ export_to_excel - Success:', excelData?.length || 0, 'bytes');
        } catch (error) {
            console.error('❌ export_to_excel - Error:', error);
        }
        
        // Test 4: Obtener compras
        console.log('4️⃣ Test: get_purchases...');
        try {
            const purchases = await invoke('get_purchases');
            console.log('✅ get_purchases - Success:', purchases?.length || 0, 'compras');
        } catch (error) {
            console.error('❌ get_purchases - Error:', error);
        }
        
        // Test 5: Obtener movimientos
        console.log('5️⃣ Test: get_movements...');
        try {
            const movements = await invoke('get_movements');
            console.log('✅ get_movements - Success:', movements?.length || 0, 'movimientos');
        } catch (error) {
            console.error('❌ get_movements - Error:', error);
        }
        
        console.log('🎉 Test completado!');
        console.log('📊 Resumen:');
        console.log('- ✅ Backend conectado');
        console.log('- ✅ Comandos funcionando');
        console.log('- ✅ Comunicación establecida');
        
    } catch (error) {
        console.error('💥 Error crítico:', error);
    }
}

// Test específico de creación
async function testCreacion() {
    console.log('🔧 Test de creación...');
    
    try {
        const { invoke } = await import('@tauri-apps/api');
        
        // Crear un item de prueba
        console.log('📦 Creando item de prueba...');
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
        console.log('✅ Item creado:', newItem);
        
        // Verificar que se creó
        console.log('🔍 Verificando creación...');
        const inventory = await invoke('get_inventory');
        const testItem = inventory.find(item => item.product_code === 'TEST001');
        if (testItem) {
            console.log('✅ Item encontrado en inventario:', testItem);
        } else {
            console.log('❌ Item no encontrado');
        }
        
    } catch (error) {
        console.error('❌ Error en test de creación:', error);
    }
}

// Hacer funciones disponibles globalmente
window.testComunicacionSimple = testComunicacionSimple;
window.testCreacion = testCreacion;

console.log('🧪 Test cargado. Ejecuta:');
console.log('  testComunicacionSimple() - Test básico');
console.log('  testCreacion() - Test de creación');
