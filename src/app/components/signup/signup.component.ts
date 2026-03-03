import { Component, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { lucideEye, lucideEyeOff, lucideUser } from '@ng-icons/lucide';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  passwordComplexityValidator,
  passwordMatchValidator,
  emailValidator,
  phoneValidator,
  nameValidator,
  noLeadingWhitespaceValidator,
  NoLeadingWhitespaceDirective,
} from '../../validators';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIconsModule,
    RouterLink,
    NoLeadingWhitespaceDirective,
    TranslatePipe,
  ],
  providers: [provideIcons({ lucideEye, lucideEyeOff, lucideUser })],
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  signupForm: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordFieldType = signal('password');
  confirmPasswordFieldType = signal('password');

  togglePasswordVisibility() {
    this.showPassword.update((value) => !value);
    this.passwordFieldType.set(this.showPassword() ? 'text' : 'password');
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update((value) => !value);
    this.confirmPasswordFieldType.set(
      this.showConfirmPassword() ? 'text' : 'password'
    );
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.signupForm = this.fb.group(
      {
        firstName: [
          '',
          [
            Validators.required,
            nameValidator(),
            noLeadingWhitespaceValidator(),
          ],
        ],
        lastName: [
          '',
          [
            Validators.required,
            nameValidator(),
            noLeadingWhitespaceValidator(),
          ],
        ],
        email: [
          '',
          [
            Validators.required,
            emailValidator(),
            noLeadingWhitespaceValidator(),
          ],
        ],
        phone: [
          '',
          [
            Validators.required,
            phoneValidator(),
            noLeadingWhitespaceValidator(),
          ],
        ],
        company: ['', [Validators.required, noLeadingWhitespaceValidator()]],
        password: [
          '',
          [
            Validators.required,
            passwordComplexityValidator(),
            noLeadingWhitespaceValidator(),
          ],
        ],
        confirmPassword: [
          '',
          [Validators.required, noLeadingWhitespaceValidator()],
        ],
      },
      {
        validators: passwordMatchValidator('password', 'confirmPassword'),
      }
    );

    // Password validation message
    this.signupForm.get('password')?.valueChanges.subscribe(() => {
      const passwordControl = this.signupForm.get('password');
      if (passwordControl?.touched && passwordControl?.invalid) {
        const error = passwordControl?.errors;
        if (error?.['minlength']) {
          passwordControl?.setErrors({
            message: 'La contraseña debe tener al menos 8 caracteres',
          });
        } else if (error?.['pattern']) {
          passwordControl?.setErrors({
            message:
              'La contraseña debe contener al menos una mayúscula, un número y un carácter especial',
          });
        }
      }
    });
  }

  onSubmit() {
    if (this.signupForm.valid) {
      const { firstName, lastName, email, phone, password, company } =
        this.signupForm.value;
      const signupData = {
        firstName,
        lastName,
        email,
        phone,
        password,
        company,
      };
      console.log('Sending signup data:', signupData); // Debug log
      this.authService.signup(signupData).subscribe({
        next: (response: { access_token: string; user: any }) => {
          this.toastr.success(
            'Registro exitoso. Por favor, inicia sesión.',
            'Éxito'
          );
          localStorage.setItem('token', response.access_token);
          this.router.navigate(['/login']);
        },
        error: (error: any) => {
          console.error('Signup error:', error); // Debug log
          this.toastr.error('Error al registrarse: ' + error.message, 'Error');
        },
        complete: () => {
          // Handle completion if needed
        },
      });
    }
  }
}
