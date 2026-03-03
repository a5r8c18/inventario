import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TauriService } from '../tauri.service';

export interface LicenseStatus {
  is_valid: boolean;
  days_remaining: number;
  expires_at: string;
  license_key: string;
  status: string;
  warning: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class LicenseService {
  private licenseStatusSubject = new BehaviorSubject<LicenseStatus | null>(null);
  licenseStatus$ = this.licenseStatusSubject.asObservable();

  private warningShownToday = false;

  constructor(private tauriService: TauriService) {}

  async checkLicense(): Promise<LicenseStatus> {
    try {
      const status = await this.tauriService.getLicenseStatus();
      this.licenseStatusSubject.next(status);
      return status;
    } catch (error) {
      console.error('Error checking license:', error);
      // If we can't check, assume expired for safety
      const expired: LicenseStatus = {
        is_valid: false,
        days_remaining: 0,
        expires_at: '',
        license_key: '',
        status: 'error',
        warning: 'No se pudo verificar la licencia.',
      };
      this.licenseStatusSubject.next(expired);
      return expired;
    }
  }

  async activateLicense(licenseKey: string): Promise<LicenseStatus> {
    try {
      const status = await this.tauriService.activateLicense(licenseKey);
      this.licenseStatusSubject.next(status);
      this.warningShownToday = false;
      return status;
    } catch (error) {
      console.error('Error activating license:', error);
      throw error;
    }
  }

  isLicenseValid(): boolean {
    const status = this.licenseStatusSubject.value;
    return status?.is_valid ?? false;
  }

  getDaysRemaining(): number {
    const status = this.licenseStatusSubject.value;
    return status?.days_remaining ?? 0;
  }

  shouldShowWarning(): boolean {
    const status = this.licenseStatusSubject.value;
    if (!status) return false;
    return status.is_valid && status.days_remaining <= 7 && status.days_remaining >= 0;
  }

  isExpired(): boolean {
    const status = this.licenseStatusSubject.value;
    if (!status) return true;
    return !status.is_valid;
  }

  getWarningMessage(): string | null {
    const status = this.licenseStatusSubject.value;
    return status?.warning ?? null;
  }

  markWarningShown(): void {
    this.warningShownToday = true;
  }

  wasWarningShownToday(): boolean {
    return this.warningShownToday;
  }
}
