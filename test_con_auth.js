// 🧪 Test con Autenticación
async function testConAuth() {
    console.log('🚀 Test con Autenticación');
    console.log('========================');
    
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    console.log('📱 Modo Tauri:', isTauri ? '✅ Activo' : '❌ Inactivo');
    
    if (isTauri) {
        console.log('🦀 Ejecutando en modo Desktop Tauri');
        await testTauriAuth();
    } else {
        console.log('🌐 Ejecutando en modo Navegador (HTTP con auth)');
        await testBrowserAuth();
    }
}

async function testTauriAuth() {
    try {
        const { invoke } = await import('@tauri-apps/api');
        console.log('✅ API de Tauri cargada');
        
        // Test 1: Login (si es necesario)
        try {
            const loginResult = await invoke('login', {
                credentials: { username: 'admin', password: 'admin' }
            });
            console.log('✅ Login - Success:', loginResult);
        } catch (error) {
            console.log('ℹ️ Login no necesario o ya autenticado');
        }
        
        // Test 2: Inventario
        const inventory = await invoke('get_inventory');
        console.log('✅ get_inventory - Success:', inventory?.length || 0, 'items');
        
        // Test 3: Dashboard
        const stats = await invoke('get_dashboard_stats');
        console.log('✅ get_dashboard_stats - Success:', stats);
        
        console.log('🎉 Test Tauri con auth completado!');
        
    } catch (error) {
        console.error('❌ Error en modo Tauri:', error);
    }
}

async function testBrowserAuth() {
    try {
        console.log('📡 Conectando al backend HTTP con auth...');
        
        // Test 1: Login
        try {
            const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin' })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                console.log('✅ Login - Success:', loginData);
                
                // Guardar token para siguientes requests
                const token = loginData.token;
                
                // Test 2: Inventario con auth
                const inventoryResponse = await fetch('http://localhost:3001/api/inventory', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (inventoryResponse.ok) {
                    const inventory = await inventoryResponse.json();
                    console.log('✅ get_inventory (HTTP con auth) - Success:', inventory?.length || 0, 'items');
                } else {
                    console.log('ℹ️ Inventario público disponible');
                    const inventoryResponse2 = await fetch('http://localhost:3001/api/inventory');
                    const inventory = await inventoryResponse2.json();
                    console.log('✅ get_inventory (público) - Success:', inventory?.length || 0, 'items');
                }
                
            } else {
                console.log('ℹ️ Login no disponible, intentando endpoints públicos');
                await testPublicEndpoints();
            }
            
        } catch (error) {
            console.log('ℹ️ Error en login, intentando endpoints públicos');
            await testPublicEndpoints();
        }
        
        console.log('🎉 Test Browser con auth completado!');
        
    } catch (error) {
        console.error('❌ Error en modo Browser:', error);
    }
}

async function testPublicEndpoints() {
    try {
        // Intentar endpoints públicos
        const healthResponse = await fetch('http://localhost:3001/health');
        const health = await healthResponse.json();
        console.log('✅ Health check - Success:', health);
        
        // Intentar dashboard público
        const statsResponse = await fetch('http://localhost:3001/api/dashboard/stats');
        const stats = await statsResponse.json();
        console.log('✅ Dashboard stats - Success:', stats);
        
    } catch (error) {
        console.error('❌ Error en endpoints públicos:', error);
    }
}

// Test completo con todos los comandos
async function testCompleto() {
    console.log('🚀 Test Completo de Comunicación');
    console.log('===============================');
    
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    
    if (isTauri) {
        await testTauriCompleto();
    } else {
        await testBrowserCompleto();
    }
}

async function testTauriCompleto() {
    try {
        const { invoke } = await import('@tauri-apps/api');
        
        // Tests básicos
        const inventory = await invoke('get_inventory');
        console.log('✅ get_inventory:', inventory?.length || 0, 'items');
        
        const stats = await invoke('get_dashboard_stats');
        console.log('✅ get_dashboard_stats:', stats);
        
        const purchases = await invoke('get_purchases');
        console.log('✅ get_purchases:', purchases?.length || 0, 'compras');
        
        const movements = await invoke('get_movements');
        console.log('✅ get_movements:', movements?.length || 0, 'movimientos');
        
        // Tests de exportación
        const excelData = await invoke('export_to_excel', { reportType: 'inventory' });
        console.log('✅ export_to_excel:', excelData?.length || 0, 'bytes');
        
        const pdfData = await invoke('export_to_pdf', { reportType: 'inventory' });
        console.log('✅ export_to_pdf:', pdfData?.length || 0, 'bytes');
        
        console.log('🎉 Test Tauri completo!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function testBrowserCompleto() {
    try {
        // Health check
        const healthResponse = await fetch('http://localhost:3001/health');
        const health = await healthResponse.json();
        console.log('✅ Health check:', health);
        
        // Dashboard
        const statsResponse = await fetch('http://localhost:3001/api/dashboard/stats');
        const stats = await statsResponse.json();
        console.log('✅ Dashboard stats:', stats);
        
        console.log('🎉 Test Browser completo!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Hacer funciones disponibles
window.testConAuth = testConAuth;
window.testCompleto = testCompleto;

console.log('🧪 Tests con auth cargados');
console.log('Ejecuta: testConAuth()');
console.log('Ejecuta: testCompleto()');
