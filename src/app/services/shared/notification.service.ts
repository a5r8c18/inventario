import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private toastr: ToastrService) {}

  showSuccess(message: string) {
    this.toastr.success(message);
  }

  showError(message: string) {
    this.toastr.error(message);
  }

  checkNotifications(products: any[]) {
    products.forEach((product) => {
      if (
        product.stockLimit !== undefined &&
        product.stock <= product.stockLimit
      ) {
        this.toastr.warning(
          `El producto ${product.productName} está por debajo del límite de stock`
        );
        // Aquí también puedes agregar la notificación a una lista interna si quieres mostrarla en la campanita
        this.addNotification({
          type: 'stock',
          message: `El producto ${product.productName} está por debajo del límite de stock`,
          productCode: product.productCode,
          date: new Date(),
        });
      }
      if (
        product.expirationDate &&
        new Date(product.expirationDate) <
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ) {
        this.toastr.warning(
          `El producto ${product.productName} está próximo a vencer`
        );
        this.addNotification({
          type: 'expiration',
          message: `El producto ${product.productName} está próximo a vencer`,
          productCode: product.productCode,
          date: new Date(),
        });
      }
    });
  }

  // Agrega una lista de notificaciones y métodos para manipularla:
  private notifications: any[] = [];

  addNotification(notification: any) {
    this.notifications.push(notification);
  }

  getNotifications() {
    return this.notifications;
  }

  clearNotifications() {
    this.notifications = [];
  }

  setNotifications(notifications: any[]) {
    this.notifications = notifications;
  }
}
