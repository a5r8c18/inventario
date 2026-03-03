// Script para limpiar completamente la base de datos usando TauriService
// Ejecutar desde la consola de desarrollador en la aplicación desktop

async function cleanDatabase() {
    console.log('🧹 Limpiando base de datos...');
    
    try {
        // Importar dinámicamente el invoke de Tauri
        const { invoke } = await import('@tauri-apps/api/core');
        
        const result = await invoke('limpiar_base_datos');
        console.log('✅ Base de datos limpiada exitosamente:');
        console.log(result);
        
        // Mostrar resultado en una alerta
        alert('Base de datos limpiada:\n' + result);
        
        // Recargar la página después de 2 segundos
        setTimeout(() => {
            console.log('🔄 Recargando aplicación...');
            window.location.reload();
        }, 2000);
        
        return result;
    } catch (error) {
        console.error('❌ Error al limpiar base de datos:', error);
        alert('Error al limpiar base de datos: ' + error);
        return null;
    }
}

// Ejecutar automáticamente
cleanDatabase();
