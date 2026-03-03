import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

export interface Filters {
  fromDate: string;
  toDate: string;
  product: string;
  expirationDate: string;
}

export interface InventoryItem {
  productCode: string;
  productName: string;
  entries: number;
  exits: number;
  stock: number;
  stockLimit?: number;
  createdAt?: string;
  unitPrice?: number;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/inventory`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService
  ) {}

  getInventory(filters?: Filters): Observable<InventoryItem[]> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getInventory()).pipe(
        map((inventory: any[]) => {
          // Convertir formato de Tauri a formato del frontend
          let items = inventory.map(item => ({
            productCode: item.productCode,
            productName: item.productName,
            entries: item.entries || 0,
            exits: item.exits || 0,
            stock: item.stock,
            stockLimit: item.stockLimit,
            createdAt: item.createdAt,
            unitPrice: item.unitPrice
          }));

          // Aplicar filtros client-side
          if (filters) {
            if (filters.product && filters.product.trim()) {
              const search = filters.product.toLowerCase().trim();
              items = items.filter(item =>
                item.productName?.toLowerCase().includes(search) ||
                item.productCode?.toLowerCase().includes(search)
              );
            }
            if (filters.fromDate) {
              items = items.filter(item => {
                if (!item.createdAt) return false;
                const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
                return itemDate >= filters.fromDate;
              });
            }
            if (filters.toDate) {
              items = items.filter(item => {
                if (!item.createdAt) return false;
                const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
                return itemDate <= filters.toDate;
              });
            }
          }

          return items;
        }),
        catchError(error => {
          console.error('Error en getInventory (Tauri):', error);
          return this.fallbackToHttp(filters);
        })
      );
    }
    
    // Fallback a HTTP para modo web
    return this.fallbackToHttp(filters);
  }

  private fallbackToHttp(filters?: Filters): Observable<InventoryItem[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
      if (filters.product) params = params.set('product', filters.product);
      if (filters.expirationDate)
        params = params.set('expirationDate', filters.expirationDate);
    }
    return this.http.get<{inventory: InventoryItem[]}>(this.apiUrl, { params })
      .pipe(map((response: {inventory: InventoryItem[]}) => response.inventory || []));
  }
}
