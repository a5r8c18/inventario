import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private apiUrl = 'http://localhost:3000/purchases';

  constructor(private http: HttpClient) {}

  createPurchase(purchaseData: any): Observable<any> {
    return this.http.post(this.apiUrl, purchaseData);
  }

  update(purchase: any) {
    return this.http.put(`${this.apiUrl}/${purchase.id}`, purchase);
  }
}
