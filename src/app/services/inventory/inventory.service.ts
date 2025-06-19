import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private apiUrl = 'https://inventario-db.onrender.com/inventory';

  constructor(private http: HttpClient) {}

  getInventory(filters?: Filters): Observable<InventoryItem[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
      if (filters.product) params = params.set('product', filters.product);
      if (filters.expirationDate)
        params = params.set('expirationDate', filters.expirationDate);
    }
    return this.http.get<InventoryItem[]>(this.apiUrl, { params });
  }
}
