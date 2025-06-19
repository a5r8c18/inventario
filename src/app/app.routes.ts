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

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [] },
  { path: 'signup', component: SignupComponent, canActivate: [] },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [],
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [],
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [],
    children: [
      { path: 'purchases', component: PurchaseFormComponent },
      { path: 'reports/reception', component: ReceptionReportComponent },
      { path: 'reports/delivery', component: DeliveryReportComponent },
      { path: 'movements', component: MovementListComponent },
      { path: 'inventory', component: InventoryListComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'manage-profile', component: ManageProfileComponent },
      { path: 'settings', component: SettingsFormComponent },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/login' },
];
