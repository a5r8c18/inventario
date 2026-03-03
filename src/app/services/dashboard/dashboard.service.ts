import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';
import { DashboardStats } from '../../../types/backend-models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService
  ) {}

  getInventoryData(): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      console.log('📊 DashboardService - Usando modo desktop (Tauri)');
      return from(this.tauriService.getDashboardStats()).pipe(
        map((stats: DashboardStats) => {
          console.log('📊 DashboardService - Datos recibidos de Tauri:', stats);
          
          // Convertir formato de Tauri a Chart.js
          const chartData = {
            labels: stats.productNames || [],
            datasets: [
              {
                label: 'Stock Actual',
                data: stats.stockLevels || [],
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
              }
            ]
          };
          
          console.log('📊 DashboardService - Datos convertidos a Chart.js:', chartData);
          return chartData;
        }),
        catchError(error => {
          console.error('❌ DashboardService - Error en modo Tauri:', error);
          return this.fallbackToHttp();
        })
      );
    }
    
    console.log('📊 DashboardService - Usando modo web (HTTP)');
    // Fallback a HTTP para modo web
    return this.fallbackToHttp();
  }

  private fallbackToHttp(): Observable<any> {
    return this.http.get(`${this.apiUrl}/chart-data`).pipe(
      map((data: any) => {
        // Transform backend data to Chart.js format
        return {
          labels: data.product_names || [],
          datasets: [
            {
              label: 'Stock Actual',
              data: data.stock_levels || [],
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1
            }
          ]
        };
      })
    );
  }
}
