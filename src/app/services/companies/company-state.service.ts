import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TauriService } from '../tauri.service';
import { Company } from '../../../types/backend-models';

@Injectable({ providedIn: 'root' })
export class CompanyStateService {
  private _activeCompany = new BehaviorSubject<Company | null>(null);
  private _companies = new BehaviorSubject<Company[]>([]);

  activeCompany$ = this._activeCompany.asObservable();
  companies$ = this._companies.asObservable();

  constructor(private tauri: TauriService) {}

  async loadAll(): Promise<void> {
    try {
      const [companies, active] = await Promise.all([
        this.tauri.getCompanies(),
        this.tauri.getActiveCompany(),
      ]);
      this._companies.next(companies);
      this._activeCompany.next(active);
    } catch (e) {
      console.error('Error loading companies:', e);
    }
  }

  async switchCompany(id: number): Promise<void> {
    const company = await this.tauri.setActiveCompany(id);
    this._activeCompany.next(company);
  }

  get activeCompany(): Company | null {
    return this._activeCompany.value;
  }

  get companies(): Company[] {
    return this._companies.value;
  }
}
