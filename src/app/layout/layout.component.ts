import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import {
  lucideChartColumnBig,
  lucidePackage,
  lucideShoppingCart,
  lucideFileText,
  lucideTruck,
  lucideSettings,
  lucidePlus,
  lucideDownload,
  lucideUpload,
  lucideBuilding2,
  lucideChevronDown,
} from '@ng-icons/lucide';
import { NotificationService, StockNotification } from '../services/shared/notification.service';
import { ProfileComponent } from '../components/profile/profile.component';
import { RoleService } from '../services/role/role.service';
import { UserService } from '../services/auth/user.service';
import { LicenseService } from '../services/license/license.service';
import { CompanyStateService } from '../services/companies/company-state.service';
import { Company } from '../../types/backend-models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, NgIconsModule, RouterModule, ProfileComponent, DatePipe],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = signal(true);
  showReportsMenu = signal(false);
  showNotifications = false;
  notifications: StockNotification[] = [];
  showProfileModal = false;
  private notificationsSub!: Subscription;

  // License warning
  showLicenseWarning = false;
  licenseWarningMessage = '';
  licenseDaysRemaining = 0;

  // Navigation items
  navigationItems = signal<any[]>([]);

  // Company selector
  showCompanySelector = false;
  companies: Company[] = [];
  activeCompany: Company | null = null;

  // Settings submenu
  showSettingsSubmenu = false;

  icons = {
    dashboard: lucideChartColumnBig,
    inventory: lucidePackage,
    purchases: lucideShoppingCart,
    reports: lucideFileText,
    movements: lucideTruck,
    settings: lucideSettings,
    plus: lucidePlus,
    download: lucideDownload,
    upload: lucideUpload,
  };

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  toggleReportsMenu() {
    this.showReportsMenu.set(!this.showReportsMenu());
  }

  constructor(
    private notificationService: NotificationService,
    private roleService: RoleService,
    private userService: UserService,
    private licenseService: LicenseService,
    public companyState: CompanyStateService,
    private router: Router
  ) {
    this.initializeNavigation();
  }

  ngOnInit() {
    this.notificationsSub = this.notificationService.notifications$.subscribe(
      (notifs) => { this.notifications = notifs; }
    );
    document.addEventListener('click', this.handleClickOutside.bind(this));
    this.setupUserRole();
    this.checkLicenseWarning();
    this.companyState.loadAll().then(() => {
      this.companies = this.companyState.companies;
      this.activeCompany = this.companyState.activeCompany;
    });
    this.companyState.companies$.subscribe(c => this.companies = c);
    this.companyState.activeCompany$.subscribe(c => this.activeCompany = c);

    // Auto-expand settings submenu when navigating to a settings route
    this.showSettingsSubmenu = this.router.url.startsWith('/settings');
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      if (e.url?.startsWith('/settings')) {
        this.showSettingsSubmenu = true;
      }
    });
  }

  async checkLicenseWarning() {
    try {
      const status = await this.licenseService.checkLicense();
      if (status.is_valid && status.days_remaining <= 7 && status.days_remaining >= 0) {
        this.showLicenseWarning = true;
        this.licenseDaysRemaining = status.days_remaining;
        this.licenseWarningMessage = status.days_remaining === 0
          ? 'Su licencia vence hoy. Contacte al proveedor para renovarla inmediatamente.'
          : `Su licencia vence en ${status.days_remaining} día(s). Contacte al proveedor para renovar su licencia antes de perder acceso al sistema.`;
      }
    } catch (error) {
      console.error('Error checking license:', error);
    }
  }

  dismissLicenseWarning() {
    this.showLicenseWarning = false;
  }

  setupUserRole() {
    // Inicializar el rol del usuario actual desde el UserService
    this.roleService.initializeUserRole();
    
    // Suscribirse a cambios en los módulos visibles para actualizar la navegación
    this.roleService.getVisibleModules().subscribe(() => {
      this.updateNavigationBasedOnRole();
    });
  }

  async switchCompany(company: Company): Promise<void> {
    try {
      await this.companyState.switchCompany(company.id);
      this.notificationService.notifyRefresh();
    } catch (e: any) {
      console.error('Error switching company:', e);
    }
    this.showCompanySelector = false;
  }

  initializeNavigation() {
    const allNavigationItems = [
      { path: '/dashboard', title: 'Dashboard', icon: 'dashboard', module: 'dashboard' },
      { path: '/inventory', title: 'Inventario', icon: 'inventory', module: 'inventory' },
      { path: '/purchases', title: 'Compras', icon: 'purchases', module: 'purchases' },
      { path: '/reports', title: 'Reportes', icon: 'reports', module: 'reports' },
      { path: '/movements', title: 'Movimientos', icon: 'movements', module: 'movements' },
      { path: '/settings', title: 'Configuración', icon: 'settings', module: 'settings' },
      { path: '/invoices', title: 'Facturas', icon: 'reports', module: 'invoices' },
      { path: '/fixed-assets', title: 'Activos Fijos', icon: 'fixedAssets', module: 'fixedAssets' },
    ];

    // Filtrar según los permisos del usuario
    const filteredItems = allNavigationItems.filter(item => 
      this.roleService.isModuleVisible(item.module)
    );

    this.navigationItems.set(filteredItems);
  }

  updateNavigationBasedOnRole() {
    // Volver a inicializar la navegación con los filtros actualizados
    this.initializeNavigation();
  }

  getIconForAction(iconName: string) {
    return this.icons[iconName as keyof typeof this.icons] || lucidePlus;
  }

  getIconForNavigation(iconName: string) {
    const iconMapping: { [key: string]: string } = {
      dashboard: 'lucideChartColumnBig',
      inventory: 'lucidePackage',
      purchases: 'lucideShoppingCart',
      reports: 'lucideFileText',
      movements: 'lucideTruck',
      settings: 'lucideSettings',
      fileText: 'lucideFileText',
      fixedAssets: 'lucideBuilding2',
    };
    return iconMapping[iconName] || 'lucideChartColumnBig';
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
    if (this.notificationsSub) {
      this.notificationsSub.unsubscribe();
    }
  }

  handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;

    // Close notifications panel
    const panel = document.getElementById('notification-panel');
    const bell  = document.getElementById('notification-bell');
    if (this.showNotifications && panel && !panel.contains(target) && bell && !bell.contains(target)) {
      this.showNotifications = false;
    }

    // Close company selector
    const selector = document.getElementById('company-selector');
    if (this.showCompanySelector && selector && !selector.contains(target)) {
      this.showCompanySelector = false;
    }
  }

  removeNotification(index: number) {
    this.notificationService.removeNotificationByIndex(index);
  }

  get unreadCount() {
    return this.notifications.length;
  }

  clearNotifications() {
    this.notificationService.clearNotifications();
  }
}
