import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = 'https://inventario-db.onrender.com/settings';

  constructor(private http: HttpClient) {}

  setStockLimit(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stock-limit`, data);
  }

  resetStockLimit(productId: string): Observable<any> {
    return this.setStockLimit({ productId, stockLimit: null }); // o 0 si prefieres
  }

  getProducts(): Observable<any> {
    return this.http.get('https://inventario-db.onrender.com/inventory');
  }
}
