import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/auth/services/auth.service';
import { User } from '../../../core/models/user.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasRoleDirective],
  templateUrl: './cuenta.component.html',
  styleUrls: ['./cuenta.component.css'],
})
export class CuentaComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  // Formularios
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Estado del componente
  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  // Visibilidad de contraseñas
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Usuario actual
  currentUser: User | null = null;

  // Verificar si el usuario es administrador
  isAdmin = signal(false);

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser();
    this.isAdmin.set(this.currentUser?.rol === 'administrador');
    this.initForms();
    this.loadProfileImage();
  }

  // Obtener encabezados con el token de autenticación
  private getAuthHeaders() {
    const token = this.authService.getToken();
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  initForms(): void {
    // Formulario de perfil
    this.profileForm = this.fb.group({
      name: [this.currentUser?.name || '', [Validators.required]],
      email: [
        this.currentUser?.email || '',
        [Validators.required, Validators.email],
      ],
      rol: [this.currentUser?.rol || '', [Validators.required]],
    });

    // Formulario de contraseña
    this.passwordForm = this.fb.group(
      {
        current_password: ['', [Validators.required, Validators.minLength(8)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirmation: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') {
      this.showCurrentPassword.set(!this.showCurrentPassword());
    } else if (field === 'new') {
      this.showNewPassword.set(!this.showNewPassword());
    } else if (field === 'confirm') {
      this.showConfirmPassword.set(!this.showConfirmPassword());
    }
  }

  passwordMatchValidator(formGroup: FormGroup): { mismatch: boolean } | null {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('password_confirmation')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  loadProfileImage(): void {
    if (!this.currentUser) return;

    // Obtener la URL base del entorno sin el sufijo '/api'
    const baseUrl = environment.urlRaiz.replace(/\/api$/, '');

    // Intentar cargar la imagen del usuario
    const userImage = new Image();
    userImage.onload = () => {
      // Si la imagen carga correctamente, usarla
      this.previewUrl = `${baseUrl}/assets/images/profiles/${
        this.currentUser?.id
      }.jpg?t=${new Date().getTime()}`;
    };

    userImage.onerror = () => {
      // Si hay error al cargar la imagen, usar la imagen predeterminada
      this.previewUrl = `${baseUrl}/assets/images/profiles/default.png`;
    };

    // Intentar cargar la imagen del usuario
    userImage.src = `${baseUrl}/assets/images/profiles/${this.currentUser.id}.jpg`;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length) {
      const file = input.files[0];

      // Validar que sea una imagen (jpg o png)
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        this.errorMessage.set('Solo se permiten archivos JPG o PNG');
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage.set('La imagen no debe superar los 2MB');
        return;
      }

      this.selectedFile = file;
      this.previewUrl = URL.createObjectURL(file);
      this.errorMessage.set('');
    }
  }

  uploadImage(): void {
    if (!this.selectedFile || !this.currentUser) return;

    const formData = new FormData();
    formData.append('profile_image', this.selectedFile);

    this.isLoading.set(true);
    this.http
      .post(
        `${environment.urlRaiz}/auth/profile-image`,
        formData,
        this.getAuthHeaders()
      )
      .subscribe({
        next: (response: any) => {
          this.successMessage.set('Imagen de perfil actualizada correctamente');
          this.isLoading.set(false);
          this.selectedFile = null;

          // Obtener la URL base del entorno sin el sufijo '/api'
          const baseUrl = environment.urlRaiz.replace(/\/api$/, '');

          // Forzar recarga de la imagen con un timestamp para evitar caché
          this.previewUrl = `${baseUrl}/assets/images/profiles/${
            this.currentUser?.id
          }.jpg?t=${new Date().getTime()}`;
        },
        error: (error) => {
          this.errorMessage.set(
            error.error.message || 'Error al subir la imagen'
          );
          this.isLoading.set(false);
        },
      });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const userData = this.profileForm.value;

    // Si el usuario no es administrador, mantener el rol original
    if (!this.isAdmin()) {
      userData.rol = this.currentUser?.rol;
    }

    // Log para depuración
    console.log('Enviando actualización de perfil:', userData);

    this.http
      .put(
        `${environment.urlRaiz}/auth/profile`,
        userData,
        this.getAuthHeaders()
      )
      .subscribe({
        next: (response: any) => {
          this.successMessage.set('Perfil actualizado correctamente');
          this.isLoading.set(false);

          // Actualizar datos del usuario en el servicio
          if (response.data) {
            this.authService.currentUser.set(response.data);
            this.currentUser = response.data;
          }
        },
        error: (error) => {
          console.error('Error al actualizar perfil:', error);
          this.errorMessage.set(
            error.error?.message || 'Error al actualizar el perfil'
          );
          this.isLoading.set(false);
        },
      });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const passwordData = this.passwordForm.value;

    // Log para depuración
    console.log('Enviando actualización de contraseña:', passwordData);

    this.http
      .put(
        `${environment.urlRaiz}/auth/change-password`,
        passwordData,
        this.getAuthHeaders()
      )
      .subscribe({
        next: () => {
          this.successMessage.set('Contraseña actualizada correctamente');
          this.isLoading.set(false);
          this.passwordForm.reset();
          // Reiniciar visibilidad de contraseñas
          this.showCurrentPassword.set(false);
          this.showNewPassword.set(false);
          this.showConfirmPassword.set(false);
        },
        error: (error) => {
          console.error('Error al actualizar contraseña:', error);
          this.errorMessage.set(
            error.error?.message || 'Error al actualizar la contraseña'
          );
          this.isLoading.set(false);
        },
      });
  }
}
