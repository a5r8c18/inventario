import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../services/profile/profile.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { map, catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NgIconsModule } from '@ng-icons/core';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  avatar: string;
  joinDate: string;
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-manage-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconsModule],
  templateUrl: './manage-profile.component.html',
})
export class ManageProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  user: User = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    avatar: '',
    joinDate: ''
  };

  // Base URL for avatar images
  private avatarBaseUrl = 'https://inventario-db.onrender.com/uploads/';

  // Get formatted avatar URL
  getAvatarUrl(profileImage: string | null): string {
    if (!profileImage) return '';
    return this.avatarBaseUrl + profileImage;
  }

  tempUser: User = { ...this.user };
  editMode = false;
  showPasswordModal = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  errors = {
    email: '',
    phone: '',
    firstName: '',
    lastName: ''
  };
  passwordErrors = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  passwordChange: PasswordChange = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private profileService: ProfileService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.profileService.getUserProfile().subscribe(
      (profile: UserProfile) => {
        this.user = {
          ...this.user,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.profileImage ? `http://localhost:3000/uploads/${profile.profileImage}` : '',
          joinDate: profile.memberSince.toISOString().split('T')[0]
        };
        this.tempUser = { ...this.user };
      },
      (error) => {
        console.error('Error loading profile:', error);
        this.errorHandler.handleError(error);
      }
    );
  }

  handleEdit() {
    this.tempUser = { ...this.user };
    this.editMode = true;
    this.errors = { email: '', phone: '', firstName: '', lastName: '' };
  }

  handleCancel() {
    this.editMode = false;
    this.showPasswordModal = false;
    this.resetPasswordForm();
    this.errors = { email: '', phone: '', firstName: '', lastName: '' };
  }

  handleSave() {
    this.errors = {
      email: !this.tempUser.email
        ? 'Email es requerido'
        : !this.validateEmail(this.tempUser.email)
        ? 'Email no válido'
        : '',
      phone: !this.tempUser.phone
        ? 'Teléfono es requerido'
        : !this.validatePhone(this.tempUser.phone)
        ? 'Teléfono no válido'
        : '',
      firstName: !this.tempUser.firstName ? 'Nombre es requerido' : '',
      lastName: !this.tempUser.lastName ? 'Apellido es requerido' : ''
    };

    if (Object.values(this.errors).some((error) => error !== '')) {
      return;
    }

    const userData = {
      firstname: this.tempUser.firstName,
      lastName: this.tempUser.lastName,
      email: this.tempUser.email,
      phone: this.tempUser.phone,
      company: '' // You can add company field if needed
    };

    this.profileService.updateProfile(userData).subscribe(
      (response) => {
        this.user = { ...this.tempUser };
        this.editMode = false;
        this.tempUser = { ...this.user };
      },
      (error) => {
        console.error('Error updating profile:', error);
        // Handle error appropriately
      }
    );
  }

  openPasswordModal() {
    this.showPasswordModal = true;
    this.resetPasswordForm();
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.resetPasswordForm();
  }

  resetPasswordForm() {
    this.passwordChange = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.passwordErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  handlePasswordChange(field: keyof PasswordChange, value: string) {
    this.passwordChange = { ...this.passwordChange, [field]: value };
    this.passwordErrors = { ...this.passwordErrors, [field]: '' };
  }

  validatePasswordChange() {
    const newErrors = {
      currentPassword:
        !this.passwordChange.currentPassword
          ? 'Contraseña actual es requerida'
          : this.passwordChange.currentPassword !== this.user.password
          ? 'Contraseña actual incorrecta'
          : '',
      newPassword:
        !this.passwordChange.newPassword
          ? 'Nueva contraseña es requerida'
          : this.passwordChange.newPassword.length < 8
          ? 'Mínimo 8 caracteres'
          : '',
      confirmPassword:
        !this.passwordChange.confirmPassword
          ? 'Confirmación es requerida'
          : this.passwordChange.confirmPassword !== this.passwordChange.newPassword
          ? 'Las contraseñas no coinciden'
          : ''
    };

    this.passwordErrors = newErrors;
    return !Object.values(newErrors).some((error) => error !== '');
  }

  savePassword() {
    if (this.validatePasswordChange()) {
      this.user.password = this.passwordChange.newPassword;
      this.closePasswordModal();
    }
  }

  handleChange(field: keyof User, value: string) {
    this.tempUser = { ...this.tempUser, [field]: value };
    this.errors = { ...this.errors, [field]: '' };
  }

  validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  validatePhone(phone: string): boolean {
    const re = /^\+?\d{10,15}$/;
    return re.test(phone);
  }

  handleAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Update the preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.tempUser.avatar = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      // Upload to backend
      this.profileService.updateAvatar(file).subscribe(
        (response) => {
          // When the avatar is successfully uploaded, use the URL returned from the backend
          this.user.avatar = response;
          this.tempUser.avatar = response;
        },
        (error) => {
          console.error('Error updating avatar:', error);
          // Handle error appropriately
        }
      );
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  formatJoinDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}