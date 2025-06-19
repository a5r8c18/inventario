import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { RouterModule } from '@angular/router';
import {
  lucideChartColumnBig,
  lucidePackage,
  lucideShoppingCart,
  lucideFileText,
  lucideTruck,
  lucideSettings,
} from '@ng-icons/lucide';
import { NotificationService } from '../services/shared/notification.service';
import { ProfileComponent } from '../components/profile/profile.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, NgIconsModule, RouterModule, ProfileComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class MainLayoutComponent {
  sidebarOpen = signal(true);
  showReportsMenu = signal(false);
  showNotifications = false;
  notifications: any[] = [];
  showProfileModal = false;

  icons = {
    dashboard: lucideChartColumnBig,
    inventory: lucidePackage,
    purchases: lucideShoppingCart,
    reports: lucideFileText,
    movements: lucideTruck,
    settings: lucideSettings,
  };

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  toggleReportsMenu() {
    this.showReportsMenu.set(!this.showReportsMenu());
  }

  constructor(private notificationService: NotificationService) {
    // Inicializar las notificaciones desde el servicio
    this.notifications = this.notificationService.getNotifications();
  }
  ngOnInit() {
    this.notifications = this.notificationService.getNotifications();
    // Detectar clics fuera del panel de notificaciones
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }

  handleClickOutside(event: MouseEvent) {
    const panel = document.getElementById('notification-panel');
    const bell = document.getElementById('notification-bell');
    if (
      this.showNotifications &&
      panel &&
      !panel.contains(event.target as Node) &&
      bell &&
      !bell.contains(event.target as Node)
    ) {
      this.showNotifications = false;
    }
  }

  removeNotification(index: number) {
    this.notifications.splice(index, 1);
    this.notificationService.setNotifications(this.notifications);
  }
  get unreadCount() {
    return this.notifications.length;
  }

  clearNotifications() {
    this.notificationService.clearNotifications();
    this.notifications = [];
  }
}
