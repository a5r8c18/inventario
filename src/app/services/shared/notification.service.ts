import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Subject } from 'rxjs';

export interface StockNotification {
  type: 'stock' | 'expiration';
  message: string;
  product_code: string;
  product_name: string;
  date: Date;
  stock?: number;
  stockLimit?: number;
  expirationDate?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications: StockNotification[] = [];
  private shownToasts: Set<string> = new Set(); // Evita toasts duplicados en la misma sesión
  private refreshSubject = new Subject<void>();
  private notificationsSubject = new BehaviorSubject<StockNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(private toastr: ToastrService) {}

  // Observable for components to subscribe to refresh events
  refresh$ = this.refreshSubject.asObservable();

  showSuccess(message: string) {
    this.toastr.success(message);
  }

  showError(message: string) {
    this.toastr.error(message);
  }

  showInfo(message: string) {
    this.toastr.info(message);
  }

  /**
   * Verifica el inventario y actualiza las notificaciones de stock.
   * - Elimina notificaciones de productos que ya tienen stock suficiente
   * - Agrega nuevas notificaciones solo si no existen
   * - Evita mostrar toasts duplicados
   */
  checkNotifications(products: any[]) {
    // Primero, eliminar notificaciones de productos que ya tienen stock suficiente
    this.removeResolvedStockNotifications(products);
    this.removeResolvedExpirationNotifications(products);

    // Luego, verificar cada producto y agregar nuevas notificaciones si es necesario
    products.forEach((product) => {
      this.checkStockNotification(product);
      this.checkExpirationNotification(product);
    });

    // Emitir cambios para que los componentes suscritos se actualicen
    this.notificationsSubject.next([...this.notifications]);
  }

  /**
   * Elimina notificaciones de stock de productos que:
   * - Ya tienen stock suficiente (por encima del límite)
   * - Tienen stock = 0 (devueltos completamente)
   * - Ya no existen en el inventario
   */
  private removeResolvedStockNotifications(products: any[]) {
    this.notifications = this.notifications.filter((notification) => {
      if (notification.type !== 'stock') return true;

      // Buscar el producto actual en el inventario
      const currentProduct = products.find(
        (p) => (p.product_code || p.productCode) === notification.product_code
      );

      if (!currentProduct) {
        // Si el producto ya no existe en el inventario, eliminar la notificación
        const toastKey = `stock_${notification.product_code}`;
        this.shownToasts.delete(toastKey);
        return false;
      }

      // Si el stock es 0 o negativo (producto devuelto), eliminar la notificación
      if (currentProduct.stock <= 0) {
        const toastKey = `stock_${notification.product_code}`;
        this.shownToasts.delete(toastKey);
        return false;
      }

      const limit = currentProduct.stockLimit ?? currentProduct.stock_limit;
      // Si el stock actual está por encima del límite, eliminar la notificación
      if (
        limit === undefined ||
        limit === null ||
        currentProduct.stock > limit
      ) {
        const toastKey = `stock_${notification.product_code}`;
        this.shownToasts.delete(toastKey);
        return false;
      }

      return true;
    });
  }

  /**
   * Elimina notificaciones de expiración de productos que ya no están próximos a vencer
   */
  private removeResolvedExpirationNotifications(products: any[]) {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    this.notifications = this.notifications.filter((notification) => {
      if (notification.type !== 'expiration') return true;

      const currentProduct = products.find(
        (p) => (p.product_code || p.productCode) === notification.product_code
      );

      if (!currentProduct) {
        return false;
      }

      // Si el producto ya no tiene fecha de expiración o no está próximo a vencer
      if (
        !currentProduct.expirationDate ||
        new Date(currentProduct.expirationDate) >= sevenDaysFromNow
      ) {
        const toastKey = `expiration_${notification.product_code}`;
        this.shownToasts.delete(toastKey);
        return false;
      }

      return true;
    });
  }

  /**
   * Verifica si un producto necesita notificación de stock bajo
   * No genera notificaciones para:
   * - Productos sin stockLimit definido
   * - Productos con stock = 0 (probablemente devueltos o sin movimiento real)
   * - Productos donde stockLimit es 0 o negativo
   */
  private checkStockNotification(product: any) {
    // Normalizar propiedades: soportar tanto camelCase como snake_case
    const stockLimit = product.stockLimit ?? product.stock_limit;
    const productCode = product.product_code || product.productCode;
    const productName = product.product_name || product.productName;

    // Ignorar productos sin límite de stock definido
    if (stockLimit === undefined || stockLimit === null) {
      return;
    }

    // Ignorar productos con stockLimit <= 0 (no configurado correctamente)
    if (stockLimit <= 0) {
      return;
    }

    // Ignorar productos con stock = 0 (probablemente devueltos completamente)
    // Solo alertar si hay stock pero está por debajo del límite
    if (product.stock <= 0) {
      return;
    }

    // Solo notificar si hay stock positivo pero por debajo del límite
    const hasLowStock = product.stock <= stockLimit;

    if (!hasLowStock) return;

    const toastKey = `stock_${productCode}`;
    const existingNotification = this.notifications.find(
      (n) => n.type === 'stock' && n.product_code === productCode
    );

    // Si ya existe una notificación para este producto, no agregar otra
    if (existingNotification) {
      // Actualizar los valores actuales en la notificación existente
      existingNotification.stock = product.stock;
      existingNotification.stockLimit = stockLimit;
      existingNotification.product_name = productName;
      existingNotification.message = `El producto ${productName} está por debajo del límite de stock (${product.stock}/${stockLimit})`;
      return;
    }

    // Agregar nueva notificación
    const notification: StockNotification = {
      type: 'stock',
      message: `El producto ${productName} está por debajo del límite de stock (${product.stock}/${stockLimit})`,
      product_code: productCode,
      product_name: productName,
      date: new Date(),
      stock: product.stock,
      stockLimit: stockLimit,
    };

    this.addNotification(notification);

    // Mostrar toast solo si no se ha mostrado antes en esta sesión
    if (!this.shownToasts.has(toastKey)) {
      this.toastr.warning(notification.message);
      this.shownToasts.add(toastKey);
    }
  }

  /**
   * Verifica si un producto necesita notificación de próxima expiración
   */
  private checkExpirationNotification(product: any) {
    if (!product.expirationDate) return;

    const expirationDate = new Date(product.expirationDate);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (expirationDate >= sevenDaysFromNow) return;

    // Normalizar propiedades
    const productCode = product.product_code || product.productCode;
    const productName = product.product_name || product.productName;

    const toastKey = `expiration_${productCode}`;
    const existingNotification = this.notifications.find(
      (n) => n.type === 'expiration' && n.product_code === productCode
    );

    if (existingNotification) {
      existingNotification.expirationDate = expirationDate;
      return;
    }

    const notification: StockNotification = {
      type: 'expiration',
      message: `El producto ${productName} está próximo a vencer`,
      product_code: productCode,
      product_name: productName,
      date: new Date(),
      expirationDate: expirationDate,
    };

    this.addNotification(notification);

    if (!this.shownToasts.has(toastKey)) {
      this.toastr.warning(notification.message);
      this.shownToasts.add(toastKey);
    }
  }

  /**
   * Agrega una notificación a la lista
   */
  addNotification(notification: StockNotification) {
    this.notifications.push(notification);
    this.notificationsSubject.next([...this.notifications]);
  }

  /**
   * Obtiene todas las notificaciones activas
   */
  getNotifications(): StockNotification[] {
    return this.notifications;
  }

  /**
   * Limpia todas las notificaciones y el historial de toasts
   */
  clearNotifications() {
    this.notifications = [];
    this.shownToasts.clear();
    this.notificationsSubject.next([]);
  }

  /**
   * Establece las notificaciones (usado para sincronización)
   */
  setNotifications(notifications: StockNotification[]) {
    this.notifications = notifications;
    this.notificationsSubject.next([...this.notifications]);
  }

  /**
   * Elimina una notificación específica por código de producto y tipo
   */
  removeNotificationByProduct(product_code: string, type: 'stock' | 'expiration') {
    this.notifications = this.notifications.filter(
      (n) => !(n.product_code === product_code && n.type === type)
    );
    const toastKey = `${type}_${product_code}`;
    this.shownToasts.delete(toastKey);
    this.notificationsSubject.next([...this.notifications]);
  }

  removeNotificationByIndex(index: number) {
    if (index >= 0 && index < this.notifications.length) {
      const removed = this.notifications[index];
      const toastKey = `${removed.type}_${removed.product_code}`;
      this.shownToasts.delete(toastKey);
      this.notifications.splice(index, 1);
      this.notificationsSubject.next([...this.notifications]);
    }
  }

  /**
   * Notifica a todos los componentes que necesitan refrescar sus datos
   */
  notifyRefresh() {
    this.refreshSubject.next();
  }

  /**
   * Refresca las notificaciones basándose en el estado actual del inventario
   * Útil para llamar después de operaciones como devoluciones
   */
  refreshNotifications(products: any[]) {
    // Limpiar toasts mostrados para permitir re-evaluación completa
    this.shownToasts.clear();
    // Re-evaluar todas las notificaciones
    this.checkNotifications(products);
  }
}
