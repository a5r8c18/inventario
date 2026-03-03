import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
  ErrorHandler,
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
  lucideFile,
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
  lucideBuilding2,
  lucideMenu,
  lucideChevronDown,
  lucideReceipt,
  lucideBoxes,
  lucideLayoutDashboard,
  lucideMove,
  lucideWrench,
  lucideEyeOff,
  lucideTrash2,
  lucideUpload,
  lucideDownload,
  lucideCircleAlert,
  lucideTriangleAlert,
  lucideCircleCheck,
  lucideCircleX,
  lucideSave,
  lucideUsers,
  lucideCalendarRange,
  lucideSearch,
  lucideArrowLeft,
  lucidePackageOpen,
} from '@ng-icons/lucide';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PurchasesService } from './services/purchases/purchases.service';
import { NotificationService } from './services/shared/notification.service';
import { UserService } from './services/auth/user.service';
import { authInterceptor } from './interceptors/auth.interceptor';

// ErrorHandler personalizado para capturar errores de Angular
class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('🔥 ERROR DE ANGULAR CAPTURADO:', {
      error: error,
      message: error.message,
      stack: error.stack,
      location: error.location
    });
    
    // Evitar que la aplicación se cierre por errores no críticos
    if (error.message?.includes('Cannot read prop') || 
        error.message?.includes('undefined') ||
        error.message?.includes('null')) {
      console.warn('⚠️ Error no crítico, la aplicación continuará funcionando');
      return;
    }
    
    // Para errores críticos, mostrar mensaje pero no cerrar
    console.error('❌ Error crítico detectado, pero la aplicación no se cerrará');
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    importProvidersFrom(
      CommonModule,
      ReactiveFormsModule,
      RouterModule,
      NgIconsModule.withIcons({
        lucideShoppingCart,
        lucidePlus,
        lucideChartColumnBig,
        lucideFileText,
        lucideFile,
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
        lucideTrash2,
        lucideUpload,
        lucideDownload,
        lucideBuilding,
        lucideBuilding2,
        lucideMenu,
        lucideChevronDown,
        lucideReceipt,
        lucideBoxes,
        lucideLayoutDashboard,
        lucideMove,
        lucideWrench,
        lucideEyeOff,
        lucideCircleAlert,
        lucideTriangleAlert,
        lucideCircleCheck,
        lucideCircleX,
        lucideSave,
        lucideUsers,
        lucideCalendarRange,
        lucideSearch,
        lucideArrowLeft,
        lucidePackageOpen,
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
    UserService,
  ],
};
