import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { LicenseService } from '../services/license/license.service';

@Injectable({
  providedIn: 'root',
})
export class LicenseGuard implements CanActivate {
  constructor(
    private licenseService: LicenseService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const status = await this.licenseService.checkLicense();

    if (!status.is_valid) {
      this.router.navigate(['/license-expired']);
      return false;
    }

    return true;
  }
}
