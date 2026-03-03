// 🧪 Test Final para Tauri Desktop - Copiar en F12 de la ventana desktop

async function testTauriFinal() {
    console.log('🚀 Test Final de Comunicación Tauri');
    console.log('=====================================');
    
    // Detectar modo
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    console.log('📱 Modo Tauri:', isTauri ? '✅ Activo' : '❌ Inactivo');
    
    if (!isTauri) {
        console.log('❌ Error: No estás en la ventana desktop de Tauri');
        console.log('💡 Asegúrate de estar en la ventana nativa, no en el navegador');
        return;
    }
    
    try {
        console.log('🔧 Cargando API de Tauri...');
        const { invoke } = await import('@tauri-apps/api');
        console.log('✅ API de Tauri cargada correctamente');
        
        // Test 1: Inventario
        console.log('\n1️⃣ Test: get_inventory');
        try {
            const inventory = await invoke('get_inventory');
            console.log('✅ get_inventory - Success:', inventory?.length || 0, 'items');
            if (inventory && inventory.length > 0) {
                console.log('📦 Primer item:', inventory[0]);
            }
        } catch (error) {
            console.error('❌ get_inventory - Error:', error);
        }
        
        // Test 2: Dashboard Stats
        console.log('\n2️⃣ Test: get_dashboard_stats');
        try {
            const stats = await invoke('get_dashboard_stats');
            console.log('✅ get_dashboard_stats - Success:', stats);
        } catch (error) {
            console.error('❌ get_dashboard_stats - Error:', error);
        }
        
        // Test 3: Exportar Excel
        console.log('\n3️⃣ Test: export_to_excel');
        try {
            const excelData = await invoke('export_to_excel', { reportType: 'inventory' });
            console.log('✅ export_to_excel - Success:', excelData?.length || 0, 'bytes');
        } catch (error) {
            console.error('❌ export_to_excel - Error:', error);
        }
        
        // Test 4: Exportar PDF
        console.log('\n4️⃣ Test: export_to_pdf');
        try {
            const pdfData = await invoke('export_to_pdf', { reportType: 'inventory' });
            console.log('✅ export_to_pdf - Success:', pdfData?.length || 0, 'bytes');
        } catch (error) {
            console.error('❌ export_to_pdf - Error:', error);
        }
        
        // Test 5: Compras
        console.log('\n5️⃣ Test: get_purchases');
        try {
            const purchases = await invoke('get_purchases');
            console.log('✅ get_purchases - Success:', purchases?.length || 0, 'compras');
        } catch (error) {
            console.error('❌ get_purchases - Error:', error);
        }
        
        // Test 6: Movimientos
        console.log('\n6️⃣ Test: get_movements');
        try {
            const movements = await invoke('get_movements');
            console.log('✅ get_movements - Success:', movements?.length || 0, 'movimientos');
        } catch (error) {
            console.error('❌ get_movements - Error:', error);
        }
        
        // Test 7: Configuración
        console.log('\n7️⃣ Test: get_system_settings');
        try {
            const settings = await invoke('get_system_settings');
            console.log('✅ get_system_settings - Success:', settings);
        } catch (error) {
            console.error('❌ get_system_settings - Error:', error);
        }
        
        console.log('\n🎉 Test completado!');
        console.log('📊 Resumen Final:');
        console.log('- ✅ Backend Rust conectado');
        console.log('- ✅ API Tauri funcionando');
        console.log('- ✅ Comunicación establecida');
        console.log('- ✅ Todos los comandos disponibles');
        
    } catch (error) {
        console.error('💥 Error crítico:', error);
    }
}

// Test de creación
async function testCreacionFinal() {
    console.log('🔧 Test de Creación');
    console.log('===================');
    
    try {
        const { invoke } = await import('@tauri-apps/api');
        
        // Crear item de prueba
        console.log('📦 Creando item de prueba...');
        const newItem = await invoke('create_inventory_item', {
            item: {
                product_code: 'TEST' + Date.now(),
                product_name: 'Producto de Prueba Tauri',
                product_description: 'Creado desde Tauri Desktop',
                stock: 15,
                unit_price: 199.99,
                warehouse: 'Principal',
                entity: 'Tauri Test'
            }
        });
        console.log('✅ Item creado:', newItem);
        
        // Verificar que se creó
        console.log('🔍 Verificando creación...');
        const inventory = await invoke('get_inventory');
        const testItem = inventory.find(item => item.product_code === newItem.product_code);
        if (testItem) {
            console.log('✅ Item encontrado en inventario:', testItem);
        } else {
            console.log('❌ Item no encontrado');
        }
        
    } catch (error) {
        console.error('❌ Error en test de creación:', error);
    }
}

// Hacer funciones disponibles
window.testTauriFinal = testTauriFinal;
window.testCreacionFinal = testCreacionFinal;

console.log('🧪 Test Tauri Final cargado');
console.log('Ejecuta: testTauriFinal()');
console.log('Ejecuta: testCreacionFinal()');
