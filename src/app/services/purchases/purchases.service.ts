import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MovementsService } from '../movements/movements.service';

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private apiUrl = 'https://inventario-db.onrender.com/purchases';

  constructor(
    private http: HttpClient,
    private movementsService: MovementsService
  ) {}

  createPurchase(purchaseData: any): Observable<any> {
    // Transformar expirationDate: empty string to null, valid date to ISO string
    purchaseData.products.forEach((product: any) => {
      const expirationDate = product.expirationDate;
      if (!expirationDate) {
        product.expirationDate = null;
      } else {
        const date = new Date(expirationDate);
        if (!isNaN(date.getTime())) {
          product.expirationDate = date.toISOString();
        }
      }
    });

    return this.http.post(this.apiUrl, purchaseData);
  }

  update(purchase: any) {
    return this.http.put(`${this.apiUrl}/${purchase.id}`, purchase);
  }
}
