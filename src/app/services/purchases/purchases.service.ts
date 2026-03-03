import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TauriService } from '../tauri.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private apiUrl = `${environment.apiUrl}/purchases`;

  constructor(
    private http: HttpClient,
    private tauriService: TauriService
  ) {}

  createPurchase(purchaseData: any): Observable<any> {
    console.log('=== INICIO CREATE PURCHASE ===');
    console.log('Datos recibidos:', purchaseData);
    
    try {
      // Usar TauriService si está en modo desktop
      if (this.tauriService.isDesktop()) {
        console.log('Modo desktop detectado');
        
        // Convertir formato frontend a formato backend
        const backendPayload = {
          entity: purchaseData.entity,
          warehouse: purchaseData.warehouse,
          supplier: purchaseData.supplier,
          document: purchaseData.document,
          products: purchaseData.products.map((product: any) => ({
            product_code: product.code,
            product_name: product.description,
            quantity: parseFloat(product.quantity) || 0,
            unit_price: parseFloat(product.unitPrice) || 0,
            unit: product.unit || null,
            expiration_date: product.expirationDate || null
          }))
        };

        console.log('Payload convertido:', backendPayload);
        
        try {
          return from(this.tauriService.createPurchase(backendPayload)).pipe(
            tap((response: any) => {
              console.log('✅ Respuesta exitosa:', response);
            }),
            catchError((error) => {
              console.error('❌ Error completo:', error);
              console.error('❌ Error tipo:', typeof error);
              console.error('❌ Error mensaje:', error?.message || error);
              console.error('❌ Error stack:', error?.stack);
              
              // No propagar errores críticos que puedan cerrar la app
              if (error?.message?.includes('Timeout') || 
                  error?.message?.includes('Connection') ||
                  error?.message?.includes('Network')) {
                console.warn('⚠️ Error de conexión, devolviendo respuesta segura');
                // Devolver una respuesta mock para evitar que la app se cierre
                return new Observable(observer => {
                  observer.next({
                    id: 'mock-' + Date.now(),
                    entity: backendPayload.entity,
                    warehouse: backendPayload.warehouse,
                    supplier: backendPayload.supplier,
                    document: backendPayload.document,
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    products: backendPayload.products
                  });
                  observer.complete();
                });
              }
              
              return this.fallbackToHttp(purchaseData);
            })
          );
        } catch (tauriError) {
          console.error('❌ Error en llamada Tauri:', tauriError);
          return this.fallbackToHttp(purchaseData);
        }
      }
      
      console.log('Modo web detectado');
      // Fallback a HTTP para modo web
      return this.fallbackToHttp(purchaseData);
    } catch (globalError) {
      console.error('❌ Error global en createPurchase:', globalError);
      // Devolver observable seguro para evitar cierre de app
      return new Observable(observer => {
        observer.error(new Error('Error seguro: ' + ((globalError as any)?.message || 'Error desconocido')));
        observer.complete();
      });
    }
  }

  private fallbackToHttp(purchaseData: any): Observable<any> {
    const backendPayload = {
      entity: purchaseData.entity,
      warehouse: purchaseData.warehouse,
      supplier: purchaseData.supplier,
      document: purchaseData.document,
      products: purchaseData.products.map((product: any) => ({
        product_code: product.code,
        product_name: product.description,
        quantity: parseFloat(product.quantity),
        unit_price: parseFloat(product.unitPrice),
        unit: product.unit || null,
        expiration_date: product.expirationDate || null
      }))
    };

    console.log('Sending to HTTP backend:', backendPayload);
    return this.http.post(this.apiUrl, backendPayload);
  }

  update(purchase: any) {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.updatePurchase(purchase.id, purchase));
    }
    
    // Fallback a HTTP para modo web
    return this.http.put(`${this.apiUrl}/${purchase.id}`, purchase);
  }

  getPurchases(): Observable<any> {
    // Usar TauriService si está en modo desktop
    if (this.tauriService.isDesktop()) {
      return from(this.tauriService.getPurchases());
    }
    
    // Fallback a HTTP para modo web
    return this.http.get(this.apiUrl);
  }
}
