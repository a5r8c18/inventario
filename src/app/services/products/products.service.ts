import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private apiUrl = 'http://localhost:3000/products';

  constructor(private http: HttpClient) {}

  getProductByCode(productCode: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${productCode}`);
  }

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
