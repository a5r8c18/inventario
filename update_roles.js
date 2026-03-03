// Script para actualizar roles de usuarios usando Tauri
// Ejecutar desde la consola de desarrollador en la aplicación desktop

async function updateRoles() {
    console.log('🚀 Actualizando roles de usuarios...');
    
    try {
        const result = await window.__TAURI__.invoke('update_user_roles');
        console.log('✅ Roles actualizados exitosamente:');
        console.log(result);
        
        // Mostrar resultado en una alerta
        alert('Roles actualizados:\n' + result);
        
        return result;
    } catch (error) {
        console.error('❌ Error al actualizar roles:', error);
        alert('Error al actualizar roles: ' + error);
        return null;
    }
}

// Ejecutar automáticamente
updateRoles();
