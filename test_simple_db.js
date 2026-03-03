// Test simple para verificar base de datos
async function testSimpleDB() {
    console.log('🚀 Test Simple de Base de Datos');
    
    try {
        const { invoke } = window.__TAURI__.core;
        
        // Test 1: Verificar estructura de tabla
        console.log('🔍 Verificando estructura de inventory...');
        
        // Intentar una consulta simple sin mapeo a struct
        const result = await invoke('test_raw_query', {
            query: "SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'"
        });
        console.log('✅ Tablas encontradas:', result);
        
        // Test 2: Verificar esquema de inventory
        const schema = await invoke('test_raw_query', {
            query: "PRAGMA table_info(inventory)"
        });
        console.log('✅ Esquema inventory:', schema);
        
        // Test 3: Contar registros
        const count = await invoke('test_raw_query', {
            query: "SELECT COUNT(*) as count FROM inventory"
        });
        console.log('✅ Total registros:', count);
        
        // Test 4: Obtener un registro simple
        const sample = await invoke('test_raw_query', {
            query: "SELECT product_code, product_name FROM inventory LIMIT 1"
        });
        console.log('✅ Registro muestra:', sample);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testSimpleDB();
