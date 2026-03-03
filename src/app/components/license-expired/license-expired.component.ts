import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LicenseService, LicenseStatus } from '../../services/license/license.service';

@Component({
  selector: 'app-license-expired',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 text-white text-center">
          <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m5-7V7a5 5 0 00-10 0v4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold">Licencia Expirada</h1>
          <p class="text-red-100 text-sm mt-1">Su acceso al sistema ha sido suspendido</p>
        </div>

        <!-- Body -->
        <div class="px-8 py-6">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p class="text-red-800 text-sm">
              Su licencia del sistema de inventario ha expirado. Para continuar usando el sistema, 
              contacte al proveedor para obtener una nueva clave de licencia.
            </p>
            @if (licenseStatus?.expires_at) {
              <p class="text-red-600 text-xs mt-2">
                Fecha de expiración: {{ licenseStatus!.expires_at | date:'dd/MM/yyyy HH:mm' }}
              </p>
            }
          </div>

          <!-- Activation form -->
          <div class="space-y-4">
            <label class="block">
              <span class="text-gray-700 text-sm font-semibold">Clave de licencia</span>
              <input 
                type="text" 
                [(ngModel)]="licenseKey"
                placeholder="Ingrese la clave proporcionada por el proveedor"
                class="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                [class.border-red-500]="activationError"
              />
            </label>

            @if (activationError) {
              <p class="text-red-600 text-sm">{{ activationError }}</p>
            }

            @if (activationSuccess) {
              <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <p class="text-green-800 text-sm">{{ activationSuccess }}</p>
              </div>
            }

            <button 
              (click)="activateLicense()"
              [disabled]="isActivating || !licenseKey.trim()"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm">
              @if (isActivating) {
                <span>Activando...</span>
              } @else {
                <span>Activar Licencia</span>
              }
            </button>
          </div>

          <div class="mt-6 pt-4 border-t border-gray-200 text-center">
            <p class="text-gray-500 text-xs">
              ¿Necesita ayuda? Contacte al proveedor del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LicenseExpiredComponent implements OnInit {
  licenseKey = '';
  isActivating = false;
  activationError = '';
  activationSuccess = '';
  licenseStatus: LicenseStatus | null = null;

  constructor(
    private licenseService: LicenseService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.licenseStatus = await this.licenseService.checkLicense();
    // If license is actually valid, redirect to dashboard
    if (this.licenseStatus?.is_valid) {
      this.router.navigate(['/dashboard']);
    }
  }

  async activateLicense() {
    this.activationError = '';
    this.activationSuccess = '';
    this.isActivating = true;

    try {
      const status = await this.licenseService.activateLicense(this.licenseKey.trim());
      if (status.is_valid) {
        this.activationSuccess = '¡Licencia activada exitosamente! Redirigiendo...';
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      } else {
        this.activationError = 'La clave de licencia no es válida. Verifique e intente nuevamente.';
      }
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || '';
      this.activationError = msg || 'Error al activar la licencia. Intente nuevamente.';
    } finally {
      this.isActivating = false;
    }
  }
}
