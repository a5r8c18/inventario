import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService
  ) {}

  getProductByCode(productCode: string): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getInventory()).pipe(
        map((inventory: any[]) => {
          // Buscar producto por código
          return inventory.find(item => item.product_code === productCode);
        }),
        catchError(error => {
          console.error('Error en getProductByCode (Tauri):', error);
          return this.fallbackToHttp(productCode);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp(productCode);
  }

  getProducts(): Observable<any[]> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getInventory()).pipe(
        catchError(error => {
          console.error('Error en getProducts (Tauri):', error);
          return this.fallbackToHttpAll();
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttpAll();
  }

  private fallbackToHttp(productCode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${productCode}`);
  }

  private fallbackToHttpAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
