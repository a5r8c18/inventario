import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { routes } from './app.routes';
import { NgIconsModule } from '@ng-icons/core';
import {
  lucideShoppingCart,
  lucidePlus,
  lucideChartColumnBig,
  lucideFileText,
  lucidePackage,
  lucideEye,
  lucideFileSpreadsheet,
  lucideFileArchive,
  lucideTruck,
  lucideRotateCcw,
  lucideSettings,
  lucideBell,
  lucideLogOut,
  lucideCamera,
  lucidePencil,
  lucideCheck,
  lucideMail,
  lucidePhone,
  lucideKey,
  lucideCalendar,
  lucideX,
  lucideUser,
  lucideBuilding,
  lucideMenu,
  lucideChevronDown,
  lucideReceipt,
  lucideBoxes,
  lucideLayoutDashboard,
  lucideMove,
  lucideWrench,
  lucideEyeOff
} from '@ng-icons/lucide';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PurchasesService } from './services/purchases/purchases.service';
import { NotificationService } from './services/shared/notification.service';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(
      CommonModule,
      ReactiveFormsModule,
      RouterModule,
      NgIconsModule.withIcons({
        lucideShoppingCart,
        lucidePlus,
        lucideChartColumnBig,
        lucideFileText,
        lucidePackage,
        lucideEye,
        lucideFileArchive,
        lucideFileSpreadsheet,
        lucideTruck,
        lucideRotateCcw,
        lucideSettings,
        lucideBell,
        lucideLogOut,
        lucideCamera,
        lucidePencil,
        lucideCheck,
        lucideX,
        lucideMail,
        lucidePhone,
        lucideKey,
        lucideCalendar,
        lucideUser,
        lucideBuilding,
        lucideMenu,
        lucideChevronDown,
        lucideReceipt,
        lucideBoxes,
        lucideLayoutDashboard,
        lucideMove,
        lucideWrench,
        lucideEyeOff,
      })
    ),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      ToastrModule.forRoot({
        timeOut: 3000,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
      })
    ),
    PurchasesService,
    NotificationService,
  ],
};
