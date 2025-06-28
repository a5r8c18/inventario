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
    return this.http.post(this.apiUrl, purchaseData).pipe(
      switchMap((purchase: any) => {
        // Crear movimiento de entrada para cada producto en la compra
        const movements = purchaseData.products.map((product: any) => ({
          type: 'ENTRY',
          productCode: product.code,
          productName: product.description,
          quantity: product.quantity,
          purchaseId: purchase.id,
          reason: 'Compra inicial'
        }));

        // Enviar los movimientos al servicio de movimientos
        return this.movementsService.registerDirectEntry(movements);
      })
    );
  }

  update(purchase: any) {
    return this.http.put(`${this.apiUrl}/${purchase.id}`, purchase);
  }
}
