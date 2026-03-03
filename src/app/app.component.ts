import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: ` <router-outlet></router-outlet> `,
  styles: [],
})
export class AppComponent implements OnInit {
  title = 'inventario';

  ngOnInit() {
    console.log('=== SISTEMA DE INVENTARIO ===');
    
    // Detectar si estamos en modo Tauri
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    
    if (isTauri) {
      console.log('🦀 MODO DESKTOP TAURI');
      console.log('📡 Usando API nativa de Tauri');
      console.log('✅ Sin dependencia de servidor HTTP externo');
    } else {
      console.log('🌐 MODO NAVEGADOR');
      console.log('📡 Conectando a backend: http://localhost:3001');
      this.checkBackend();
    }
  }

  private async checkBackend(): Promise<void> {
    try {
      console.log('🔌 Verificando conexión con backend...');

      const backendUrl = 'http://localhost:3001';

      // Try health endpoint first
      try {
        const response = await fetch(`${backendUrl}/health`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('✅ Backend Rust está corriendo en puerto 3001');
          
          try {
            const data = await response.json();
            console.log('📊 Backend response:', data);
          } catch {
            console.log('📄 Backend responded with status:', response.status);
          }
          return;
        } else {
          console.log('⚠️ Backend respondió con status:', response.status);
        }
      } catch (healthError) {
        const healthErrorMessage = healthError instanceof Error ? healthError.message : 'Unknown health error';
        console.log('⚠️ Error en /health:', healthErrorMessage);
      }

      // Fallback to root endpoint
      try {
        const rootResponse = await fetch(backendUrl, {
          method: 'GET',
          mode: 'cors',
        });

        if (rootResponse.ok) {
          console.log('✅ Backend Rust accesible via endpoint raíz');
          
          try {
            const data = await rootResponse.json();
            console.log('📊 Root response:', data);
          } catch {
            console.log('📄 Root responded with status:', rootResponse.status);
          }
        } else {
          console.log('❌ Error en endpoint raíz:', rootResponse.status);
        }
      } catch (rootError) {
        const errorMessage = rootError instanceof Error ? rootError.message : 'Unknown error';
        console.log('❌ Error en endpoint raíz:', errorMessage);
        console.log('💡 Verifica que el backend esté corriendo en http://localhost:3001');
      }
      
    } catch (error) {
      console.log('⚠️ Error general verificando backend:', error);
    }
  }
}