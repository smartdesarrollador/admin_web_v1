import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  token: string | null = null;
  email: string | null = null;
  isTokenValid = false;
  isTokenValidating = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.resetForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirmation: ['', Validators.required],
      },
      { validators: this.checkPasswords }
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    this.email = this.route.snapshot.queryParamMap.get('email');

    if (!this.token || !this.email) {
      this.errorMessage =
        'Enlace de recuperación inválido. Por favor solicita un nuevo enlace.';
      this.isTokenValidating = false;
      return;
    }

    // Validar token antes de mostrar el formulario
    this.authService
      .validateResetToken(this.token, this.email)
      .pipe(finalize(() => (this.isTokenValidating = false)))
      .subscribe({
        next: () => {
          this.isTokenValid = true;
        },
        error: (error) => {
          this.errorMessage =
            error.error.message ||
            'El enlace de recuperación no es válido o ha expirado.';
        },
      });
  }

  // Validador personalizado para confirmar que las contraseñas coinciden
  checkPasswords(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('password_confirmation')?.value;
    return password === confirmPassword ? null : { notSame: true };
  }

  get passwordControl() {
    return this.resetForm.get('password');
  }

  get passwordConfirmControl() {
    return this.resetForm.get('password_confirmation');
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.resetForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.authService
      .resetPassword({
        email: this.email!,
        token: this.token!,
        password: this.resetForm.value.password,
        password_confirmation: this.resetForm.value.password_confirmation,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response: any) => {
          this.successMessage =
            response.message ||
            'Tu contraseña ha sido restablecida exitosamente.';
          this.resetForm.reset();

          // Redireccionar al login después de unos segundos
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 3000);
        },
        error: (error) => {
          this.errorMessage =
            error.error.message ||
            'Ocurrió un error al restablecer tu contraseña. Intenta de nuevo.';
        },
      });
  }
}
