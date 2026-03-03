import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgIconsModule } from '@ng-icons/core';
import { TauriService } from '../../services/tauri.service';
import { CompanyStateService } from '../../services/companies/company-state.service';
import { Company } from '../../../types/backend-models';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule],
  templateUrl: './companies.component.html',
})
export class CompaniesComponent implements OnInit {
  companies: Company[] = [];
  loading = true;
  saving = false;
  error = '';

  showModal = false;
  editingCompany: Company | null = null;
  form!: FormGroup;

  constructor(
    private tauri: TauriService,
    private companyState: CompanyStateService,
    private fb: FormBuilder
  ) {
    this.buildForm();
  }

  async ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      this.companies = await this.tauri.getCompanies();
      await this.loadLogoCache();
    } catch (e: any) {
      this.error = typeof e === 'string' ? e : (e?.message ?? 'Error al cargar empresas');
    } finally {
      this.loading = false;
    }
  }

  private async loadLogoCache() {
    for (const c of this.companies) {
      if (c.logo_path && !this.logoCache.has(c.logo_path)) {
        try {
          const b64 = await this.tauri.getImageAsBase64(c.logo_path);
          this.logoCache.set(c.logo_path, b64);
        } catch { /* sin logo */ }
      }
    }
  }

  logoPreview: string | null = null;
  private logoCache = new Map<string, string>();

  buildForm() {
    this.form = this.fb.group({
      name:      ['', [Validators.required, Validators.minLength(2)]],
      tax_id:    [''],
      address:   [''],
      phone:     [''],
      email:     [''],
      logo_path: [''],
    });
  }

  async pickLogo() {
    try {
      // @ts-ignore
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        this.form.patchValue({ logo_path: selected });
        try {
          this.logoPreview = await this.tauri.getImageAsBase64(selected);
          this.logoCache.set(selected, this.logoPreview);
        } catch {
          this.logoPreview = selected;
        }
      }
    } catch (e) {
      console.error('Error opening file dialog:', e);
    }
  }

  logoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return this.logoCache.get(path) ?? null;
  }

  openCreate() {
    this.editingCompany = null;
    this.form.reset();
    this.error = '';
    this.showModal = true;
  }

  openEdit(company: Company) {
    this.editingCompany = company;
    this.logoPreview = company.logo_path ? (this.logoCache.get(company.logo_path) ?? null) : null;
    this.form.patchValue({
      name:      company.name,
      tax_id:    company.tax_id ?? '',
      address:   company.address ?? '',
      phone:     company.phone ?? '',
      email:     company.email ?? '',
      logo_path: company.logo_path ?? '',
    });
    this.error = '';
    this.showModal = true;
  }

  async save() {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      const dto = {
        name:      this.form.value.name,
        tax_id:    this.form.value.tax_id    || undefined,
        address:   this.form.value.address   || undefined,
        phone:     this.form.value.phone     || undefined,
        email:     this.form.value.email     || undefined,
        logo_path: this.form.value.logo_path || undefined,
      };
      if (this.editingCompany) {
        await this.tauri.updateCompany(this.editingCompany.id, dto);
      } else {
        await this.tauri.createCompany(dto);
      }
      await this.load();
      await this.companyState.loadAll();
      this.logoPreview = null;
      this.showModal = false;
    } catch (e: any) {
      this.error = typeof e === 'string' ? e : (e?.message ?? 'Error al guardar empresa');
    } finally {
      this.saving = false;
    }
  }

  async delete(company: Company) {
    if (!confirm(`¿Eliminar la empresa "${company.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await this.tauri.deleteCompany(company.id);
      await this.load();
      await this.companyState.loadAll();
    } catch (e: any) {
      this.error = typeof e === 'string' ? e : (e?.message ?? 'Error al eliminar empresa');
    }
  }

  get activeCompany() {
    return this.companyState.activeCompany;
  }

  async setActive(company: Company) {
    try {
      await this.companyState.switchCompany(company.id);
    } catch (e: any) {
      this.error = typeof e === 'string' ? e : (e?.message ?? 'Error al cambiar empresa activa');
    }
  }
}
