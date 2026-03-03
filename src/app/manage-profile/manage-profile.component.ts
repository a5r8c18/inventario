import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../services/profile/profile.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { map, catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NgIconsModule } from '@ng-icons/core';
import { environment } from '../../environments/environment';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  avatar: string;
  joinDate: string;
  company?: string;
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
    joinDate: '',
    company: ''
  };

  // Base URL for avatar images - using the same API URL as other services
  private get avatarBaseUrl(): string {
    return `${environment.apiUrl}/uploads/`;
  }

  // Get formatted avatar URL
  getAvatarUrl(profileImage: string | null): string {
    if (!profileImage) return '';
    
    // If it's already a data URL (base64), return as-is
    if (profileImage.startsWith('data:')) {
      return profileImage;
    }
    
    // In desktop mode, we shouldn't have HTTP URLs for avatars
    // If we get here, it might be an old format or error
    console.warn('Avatar URL format not supported in desktop mode:', profileImage);
    return profileImage;
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
        const avatarUrl = profile.profileImage ? this.getAvatarUrl(profile.profileImage) : '';
        console.log('Avatar URL:', avatarUrl); // Debug log
        
        this.user = {
          ...this.user,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          avatar: avatarUrl,
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

    const userData: any = {};
    
    // Only include fields that have values and meet backend validation
    if (this.tempUser.firstName && this.tempUser.firstName.trim().length >= 1 && this.tempUser.firstName.trim().length <= 100) {
      userData.first_name = this.tempUser.firstName.trim();
    }
    
    if (this.tempUser.lastName && this.tempUser.lastName.trim().length >= 1 && this.tempUser.lastName.trim().length <= 100) {
      userData.last_name = this.tempUser.lastName.trim();
    }
    
    if (this.tempUser.email && this.validateEmail(this.tempUser.email)) {
      userData.email = this.tempUser.email.trim();
    }
    
    if (this.tempUser.phone && this.validatePhone(this.tempUser.phone)) {
      userData.phone = this.tempUser.phone.trim();
    }
    
    if (this.tempUser.company && this.tempUser.company.trim().length >= 1 && this.tempUser.company.trim().length <= 100) {
      userData.company = this.tempUser.company.trim();
    }

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
    // Backend validation: length between 10 and 20 characters
    return phone.length >= 10 && phone.length <= 20;
  }

  handleAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('El archivo debe ser una imagen');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.error('La imagen no debe superar los 5MB');
        return;
      }
      
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
          console.log('Avatar actualizado exitosamente:', response);
          // Handle both direct string response and object with avatar property
          const avatarUrl = typeof response === 'string' ? response : response.avatar;
          this.user.avatar = this.getAvatarUrl(avatarUrl);
          this.tempUser.avatar = this.getAvatarUrl(avatarUrl);
        },
        (error) => {
          console.error('Error updating avatar:', error);
          this.errorHandler.handleError(error);
          // Revert to original avatar on error
          this.tempUser.avatar = this.user.avatar;
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