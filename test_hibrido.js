// 🧪 Test Híbrido - Funciona en ambos modos
async function testHibrido() {
    console.log('🚀 Test Híbrido de Comunicación');
    console.log('===============================');
    
    // Detectar modo
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    console.log('📱 Modo Tauri:', isTauri ? '✅ Activo' : '❌ Inactivo');
    
    if (isTauri) {
        console.log('🦀 Ejecutando test en modo Desktop Tauri');
        await testTauriMode();
    } else {
        console.log('🌐 Ejecutando test en modo Navegador (usando backend HTTP)');
        await testBrowserMode();
    }
}

async function testTauriMode() {
    try {
        const { invoke } = await import('@tauri-apps/api');
        console.log('✅ API de Tauri cargada');
        
        // Test 1: Inventario
        const inventory = await invoke('get_inventory');
        console.log('✅ get_inventory - Success:', inventory?.length || 0, 'items');
        
        // Test 2: Dashboard
        const stats = await invoke('get_dashboard_stats');
        console.log('✅ get_dashboard_stats - Success:', stats);
        
        // Test 3: Exportación
        const excelData = await invoke('export_to_excel', { reportType: 'inventory' });
        console.log('✅ export_to_excel - Success:', excelData?.length || 0, 'bytes');
        
        console.log('🎉 Test Tauri completado!');
        
    } catch (error) {
        console.error('❌ Error en modo Tauri:', error);
    }
}

async function testBrowserMode() {
    try {
        console.log('📡 Conectando al backend HTTP en localhost:3001');
        
        // Test 1: Health check
        const response = await fetch('http://localhost:3001/health');
        const health = await response.json();
        console.log('✅ Health check - Success:', health);
        
        // Test 2: Inventario
        const inventoryResponse = await fetch('http://localhost:3001/api/inventory');
        const inventory = await inventoryResponse.json();
        console.log('✅ get_inventory (HTTP) - Success:', inventory?.length || 0, 'items');
        
        // Test 3: Dashboard
        const statsResponse = await fetch('http://localhost:3001/api/dashboard/stats');
        const stats = await statsResponse.json();
        console.log('✅ get_dashboard_stats (HTTP) - Success:', stats);
        
        console.log('🎉 Test Browser completado!');
        
    } catch (error) {
        console.error('❌ Error en modo Browser:', error);
    }
}

// Test de creación híbrido
async function testCreacionHibrida() {
    console.log('🔧 Test de Creación Híbrido');
    console.log('========================');
    
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    
    if (isTauri) {
        try {
            const { invoke } = await import('@tauri-apps/api');
            
            const newItem = await invoke('create_inventory_item', {
                item: {
                    product_code: 'TEST' + Date.now(),
                    product_name: 'Producto Tauri Test',
                    product_description: 'Creado desde Tauri',
                    stock: 20,
                    unit_price: 299.99,
                    warehouse: 'Principal',
                    entity: 'Tauri'
                }
            });
            console.log('✅ Item creado (Tauri):', newItem);
            
        } catch (error) {
            console.error('❌ Error creación (Tauri):', error);
        }
    } else {
        try {
            const newItem = {
                product_code: 'TEST' + Date.now(),
                product_name: 'Producto Browser Test',
                product_description: 'Creado desde Browser',
                stock: 25,
                unit_price: 399.99,
                warehouse: 'Principal',
                entity: 'Browser'
            };
            
            const response = await fetch('http://localhost:3001/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            
            const result = await response.json();
            console.log('✅ Item creado (Browser):', result);
            
        } catch (error) {
            console.error('❌ Error creación (Browser):', error);
        }
    }
}

// Hacer funciones disponibles
window.testHibrido = testHibrido;
window.testCreacionHibrida = testCreacionHibrida;

console.log('🧪 Test Híbrido cargado');
console.log('Ejecuta: testHibrido()');
console.log('Ejecuta: testCreacionHibrida()');
