import { Routes } from '@angular/router';

import { PurchaseFormComponent } from './components/purchase-form/purchase-form.component';

import { ReceptionReportComponent } from './components/reception-report/reception-report.component';

import { DeliveryReportComponent } from './components/delivery-report/delivery-report.component';

import { MovementListComponent } from './components/movement-list/movement-list.component';

import { InventoryListComponent } from './components/inventory-list/inventory-list.component';

import { DashboardComponent } from './components/dashboard/dashboard.component';

import { SettingsFormComponent } from './components/settings-form/settings-form.component';

import { ProfileComponent } from './components/profile/profile.component';

import { LoginComponent } from './components/login/login.component';

import { SignupComponent } from './components/signup/signup.component';

import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';

import { ResetPasswordComponent } from './components/reset-password/reset-password.component';

import { MainLayoutComponent } from './layout/layout.component';

import { ManageProfileComponent } from './manage-profile/manage-profile.component';

import { InvoiceFormComponent } from './components/invoice-form/invoice-form.component';

import { InvoiceListComponent } from './components/invoice-list/invoice-list.component';

import { InvoiceViewComponent } from './components/invoice-view/invoice-view.component';

import { ReportsComponent } from './components/reports/reports.component';

import { LicenseExpiredComponent } from './components/license-expired/license-expired.component';

import { LicenseGuard } from './guards/license.guard';
import { FixedAssetsComponent } from './components/fixed-assets/fixed-assets.component';
import { CompaniesComponent } from './components/companies/companies.component';



export const routes: Routes = [

  { path: 'login', component: LoginComponent },

  { path: 'signup', component: SignupComponent },

  { path: 'license-expired', component: LicenseExpiredComponent },

  {

    path: 'forgot-password',

    component: ForgotPasswordComponent,

  },

  {

    path: 'reset-password',

    component: ResetPasswordComponent,

  },

  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {

    path: '',

    component: MainLayoutComponent,

    canActivate: [LicenseGuard],

    children: [

      { path: 'purchases', component: PurchaseFormComponent },

      { path: 'reports', component: ReportsComponent },

      { path: 'reports/reception', component: ReceptionReportComponent },

      { path: 'reports/delivery', component: DeliveryReportComponent },

      { path: 'movements', component: MovementListComponent },

      { path: 'inventory', component: InventoryListComponent },

      { path: 'dashboard', component: DashboardComponent },

      { path: 'manage-profile', component: ManageProfileComponent },

      { path: 'settings', component: SettingsFormComponent },

      { path: 'profile', component: ProfileComponent },

      { path: 'invoices/new', component: InvoiceFormComponent },

      { path: 'invoices/:id', component: InvoiceViewComponent },

      { path: 'invoices', component: InvoiceListComponent },

      { path: 'fixed-assets', component: FixedAssetsComponent },

      { path: 'settings/companies', component: CompaniesComponent },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

    ],

  },

  { path: '**', redirectTo: '/login' },

];

