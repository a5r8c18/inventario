import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service'; // Asegúrate de ajustar la ruta
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgIconsModule } from '@ng-icons/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div class="flex justify-center mb-6">
          <ng-icon
            name="lucideKey"
            class="text-indigo-600"
            size="2rem"
          ></ng-icon>
        </div>
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
          Restablecer Contraseña
        </h2>
        <p class="text-sm text-gray-600 mb-6 text-center">
          Ingresa tu nueva contraseña para restablecer tu cuenta.
        </p>
        <form
          [formGroup]="resetPasswordForm"
          (ngSubmit)="onSubmit()"
          class="space-y-6"
        >
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700"
              >Nueva Contraseña</label
            >
            <input
              id="password"
              type="password"
              formControlName="password"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              [class.border-red-500]="
                resetPasswordForm.get('password')?.invalid &&
                resetPasswordForm.get('password')?.touched
              "
            />
            <div
              *ngIf="
                resetPasswordForm.get('password')?.invalid &&
                resetPasswordForm.get('password')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              La contraseña debe tener al menos 8 caracteres, incluyendo letras,
              números y caracteres especiales.
            </div>
          </div>
          <div>
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-gray-700"
              >Confirmar Contraseña</label
            >
            <input
              id="confirmPassword"
              type="password"
              formControlName="confirmPassword"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              [class.border-red-500]="
                resetPasswordForm.get('confirmPassword')?.invalid &&
                resetPasswordForm.get('confirmPassword')?.touched
              "
            />
            <div
              *ngIf="
                resetPasswordForm
                  .get('confirmPassword')
                  ?.hasError('mismatch') &&
                resetPasswordForm.get('confirmPassword')?.touched
              "
              class="text-red-500 text-sm mt-1"
            >
              Las contraseñas no coinciden.
            </div>
          </div>
          <div>
            <button
              type="submit"
              [disabled]="resetPasswordForm.invalid"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Restablecer Contraseña
            </button>
          </div>
        </form>
        <p class="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?
          <a routerLink="/login" class="text-indigo-600 hover:text-indigo-500"
            >Inicia sesión</a
          >
        </p>
      </div>
    </div>
  `,
  styles: [],
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  token: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.resetPasswordForm = this.fb.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
            ),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit() {
    // Obtener el token de la URL
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.toastr.error('Token inválido o ausente', 'Error');
        this.router.navigate(['/login']);
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit() {
    if (this.resetPasswordForm.valid) {
      const { password } = this.resetPasswordForm.value;
      this.authService.resetPassword(this.token, password).subscribe({
        next: (response) => {
          this.toastr.success('Contraseña restablecida correctamente', 'Éxito');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.toastr.error(
            'Error al restablecer la contraseña: ' + error.message,
            'Error'
          );
        },
      });
    }
  }
}
