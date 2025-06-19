import { Component, OnInit } from '@angular/core';
import { first, catchError } from 'rxjs/operators';
import { ProfileService } from '../../services/profile/profile.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  memberSince: Date;
  profileImage: string | null;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  imports: [
    CommonModule,
    NgIconsModule,
  ],
  standalone: true
})
export class ProfileComponent implements OnInit {
  loading = true;
  error: string | null = null;
  userData: UserProfile | null = null;

  constructor(
    private profileService: ProfileService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.loading = true;
    this.profileService.getUserProfile()
      .pipe(
        first(),
        catchError(error => {
          this.error = error;
          return [];
        })
      )
      .subscribe(data => {
        this.userData = data;
        this.loading = false;
      });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getInitials(): string {
    if (this.userData) {
      return (this.userData.firstName?.[0] || '') + (this.userData.lastName?.[0] || '');
    }
    return 'U';
  }

  getRegistrationDate(): string {
    if (this.userData?.memberSince) {
      return new Date(this.userData.memberSince).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return 'N/A';
  }
}
