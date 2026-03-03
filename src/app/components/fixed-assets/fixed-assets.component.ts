import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgIconsModule } from '@ng-icons/core';
import { TauriService } from '../../services/tauri.service';
import { NotificationService } from '../../services/shared/notification.service';
import { Subscription } from 'rxjs';
import {
  FixedAsset, CreateFixedAssetDto, UpdateFixedAssetDto,
  FixedAssetDepreciation, DepreciationGroup
} from '../../../types/backend-models';

@Component({
  selector: 'app-fixed-assets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule],
  templateUrl: './fixed-assets.component.html',
})
export class FixedAssetsComponent implements OnInit, OnDestroy {
  private refreshSub!: Subscription;
  assets: FixedAsset[] = [];
  catalog: DepreciationGroup[] = [];
  depreciationResults: FixedAssetDepreciation[] = [];

  loading = signal(false);
  showForm = signal(false);
  showDepreciationModal = signal(false);
  editingAsset: FixedAsset | null = null;
  selectedAsset: FixedAsset | null = null;
  showHistoryModal = signal(false);

  form!: FormGroup;
  error = '';
  success = '';
  calculating = false;

  get currentYear(): number { return new Date().getFullYear(); }

  get selectedGroup(): DepreciationGroup | null {
    const gn = this.form?.get('group_number')?.value;
    return this.catalog.find(g => g.group_number === +gn) ?? null;
  }

  constructor(
    private tauri: TauriService,
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadAll();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadAll());
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  buildForm() {
    this.form = this.fb.group({
      asset_code:          ['', Validators.required],
      name:                ['', Validators.required],
      description:         [''],
      group_number:        [null, Validators.required],
      subgroup:            ['', Validators.required],
      subgroup_detail:     [''],
      acquisition_value:   [null, [Validators.required, Validators.min(0.01)]],
      acquisition_date:    ['', Validators.required],
      location:            [''],
      responsible_person:  [''],
    });

    this.form.get('group_number')?.valueChanges.subscribe(() => {
      this.form.patchValue({ subgroup: '' });
    });
  }

  async loadAll() {
    this.loading.set(true);
    try {
      const [assets, catalog] = await Promise.all([
        this.tauri.getFixedAssets(),
        this.tauri.getDepreciationCatalog(),
      ]);
      this.assets = assets;
      this.catalog = catalog;
    } catch (e: any) {
      this.error = e?.message || 'Error al cargar activos fijos';
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.editingAsset = null;
    this.form.reset();
    this.error = '';
    this.success = '';
    this.showForm.set(true);
  }

  openEdit(asset: FixedAsset) {
    this.editingAsset = asset;
    this.form.patchValue({
      asset_code:         asset.asset_code,
      name:               asset.name,
      description:        asset.description ?? '',
      group_number:       asset.group_number,
      subgroup:           asset.subgroup,
      subgroup_detail:    asset.subgroup_detail ?? '',
      acquisition_value:  asset.acquisition_value,
      acquisition_date:   asset.acquisition_date.substring(0, 10),
      location:           asset.location ?? '',
      responsible_person: asset.responsible_person ?? '',
    });
    this.error = '';
    this.success = '';
    this.showForm.set(true);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error = '';
    try {
      if (this.editingAsset) {
        const dto: UpdateFixedAssetDto = {
          name:               this.form.value.name,
          description:        this.form.value.description || undefined,
          location:           this.form.value.location || undefined,
          responsible_person: this.form.value.responsible_person || undefined,
        };
        await this.tauri.updateFixedAsset(this.editingAsset.id, dto);
        this.success = 'Activo actualizado correctamente';
      } else {
        const dto: CreateFixedAssetDto = {
          asset_code:         this.form.value.asset_code,
          name:               this.form.value.name,
          description:        this.form.value.description || undefined,
          group_number:       +this.form.value.group_number,
          subgroup:           this.form.value.subgroup,
          subgroup_detail:    this.form.value.subgroup_detail || undefined,
          acquisition_value:  +this.form.value.acquisition_value,
          acquisition_date:   this.form.value.acquisition_date,
          location:           this.form.value.location || undefined,
          responsible_person: this.form.value.responsible_person || undefined,
        };
        await this.tauri.createFixedAsset(dto);
        this.success = 'Activo creado correctamente';
      }
      await this.loadAll();
      this.showForm.set(false);
    } catch (e: any) {
      this.error = e?.message || 'Error al guardar activo';
    } finally {
      this.loading.set(false);
    }
  }

  async deleteAsset(asset: FixedAsset) {
    if (!confirm(`¿Eliminar el activo "${asset.name}"?`)) return;
    try {
      await this.tauri.deleteFixedAsset(asset.id);
      await this.loadAll();
    } catch (e: any) {
      this.error = e?.message || 'Error al eliminar activo';
    }
  }

  async calculateDepreciation() {
    this.calculating = true;
    this.error = '';
    try {
      this.depreciationResults = await this.tauri.calculateDepreciation(this.currentYear);
      await this.loadAll();
      this.showDepreciationModal.set(true);
      this.success = `Depreciación ${this.currentYear} calculada: ${this.depreciationResults.length} activo(s) procesados`;
    } catch (e: any) {
      this.error = e?.message || 'Error al calcular depreciación';
    } finally {
      this.calculating = false;
    }
  }

  getGroupName(groupNumber: number): string {
    return this.catalog.find(g => g.group_number === groupNumber)?.group_name ?? `Grupo ${groupNumber}`;
  }

  getDepreciationRate(asset: FixedAsset): string {
    return `${asset.depreciation_rate}%`;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { active: 'Activo', disposed: 'Dado de baja', transferred: 'Transferido' };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      disposed: 'bg-red-100 text-red-800',
      transferred: 'bg-yellow-100 text-yellow-800',
    };
    return map[status] ?? 'bg-gray-100 text-gray-800';
  }

  get totalAcquisitionValue(): number {
    return this.assets.reduce((s, a) => s + a.acquisition_value, 0);
  }

  get totalCurrentValue(): number {
    return this.assets.reduce((s, a) => s + a.current_value, 0);
  }

  get totalDepreciated(): number {
    return this.totalAcquisitionValue - this.totalCurrentValue;
  }
}
