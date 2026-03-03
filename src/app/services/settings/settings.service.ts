import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/settings`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService
  ) {}

  setStockLimit(data: any): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.setStockLimit(data.productCode || data.productId, data.stockLimit));
    }
    
    // Fallback a HTTP para modo web
    return this.http.post(`${this.apiUrl}/stock-limit`, data);
  }

  resetStockLimit(productId: string): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.removeStockLimit(productId));
    }
    
    // Fallback a HTTP para modo web
    return this.http.delete(`${this.apiUrl}/stock-limit/${productId}`);
  }

  getStockLimits(): Observable<any[]> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getStockLimits());
    }
    
    // Fallback a HTTP para modo web
    return this.http.get<any[]>(`${this.apiUrl}/stock-limits`);
  }

  getProducts(): Observable<any[]> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getInventory()).pipe(
        map((inventory: any[]) => inventory.filter((p: any) => p.stock > 0)),
        catchError(error => {
          console.error('Error en getProducts (Tauri):', error);
          return this.fallbackToHttp();
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp();
  }

  private fallbackToHttp(): Observable<any[]> {
    return this.http.get<{ inventory: any[] }>(`${environment.apiUrl}/inventory`).pipe(
      map((response) => (response.inventory || []).filter((p: any) => p.stock > 0))
    );
  }
}
