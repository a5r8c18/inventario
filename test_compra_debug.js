// Script para probar el registro de compras con manejo de errores
console.log('🧪 Iniciando prueba de registro de compra...');

// Datos de prueba para una compra
const testData = {
    entity: "Entidad Test",
    warehouse: "Almacén Principal", 
    supplier: "Proveedor Test",
    document: "DOC-001",
    products: [
        {
            product_code: "TEST001",
            product_name: "Producto de Prueba",
            quantity: 10,
            unit_price: 25.50
        }
    ]
};

async function testCompraRegistro() {
    try {
        console.log('📦 Enviando datos de compra:', testData);
        
        const response = await fetch('http://localhost:4200/api/purchases', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📡 Status de respuesta:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en respuesta:', errorText);
            return;
        }
        
        const result = await response.json();
        console.log('✅ Compra registrada exitosamente:', result);
        
    } catch (error) {
        console.error('💥 Error al registrar compra:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Ejecutar prueba
testCompraRegistro();
