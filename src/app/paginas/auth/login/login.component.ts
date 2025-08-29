import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { AuthService } from '../../../core/auth/services/auth.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ConfiguracionesService } from '../../../core/services/configuraciones.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AsyncPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private configuracionesService = inject(ConfiguracionesService);

  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  // Configuraciones
  logoUrl: Observable<string>;
  colorPrimario: Observable<string>;
  colorSecundario: Observable<string>;
  colorGradiente: Observable<string>;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    // Cargar la URL del logo desde las configuraciones
    this.logoUrl = this.configuracionesService.getImagenUrl('logo_principal');

    // Cargar los colores desde las configuraciones
    this.colorPrimario = this.configuracionesService
      .getAllConfiguraciones()
      .pipe(map((configs) => configs['color_primario'] || '#3B82F6'));

    this.colorSecundario = this.configuracionesService
      .getAllConfiguraciones()
      .pipe(map((configs) => configs['color_secundario'] || '#10B981'));

    // Gradiente para el fondo
    this.colorGradiente = this.configuracionesService
      .getAllConfiguraciones()
      .pipe(
        map((configs) => {
          if (configs['usar_gradiente'] && configs['gradiente_colores']) {
            try {
              const gradienteConfig = JSON.parse(configs['gradiente_colores']);
              return `linear-gradient(135deg, ${
                gradienteConfig.inicio || '#4F46E5'
              }, ${gradienteConfig.fin || '#10B981'})`;
            } catch (e) {
              return 'linear-gradient(135deg, #4F46E5, #10B981)';
            }
          }
          return 'linear-gradient(135deg, #EBF4FF, #DBEAFE)';
        })
      );
  }

  ngOnInit(): void {
    this.initForm();

    // Verificar si hay un error en los parámetros de la URL (redireccionado por el guard)
    const errorParam = this.route.snapshot.queryParams['error'];
    if (errorParam) {
      this.errorMessage = errorParam;
    }

    // Si ya está autenticado, redireccionar al dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error de inicio de sesión:', error);

        if (error.status === 401) {
          this.errorMessage =
            'Credenciales incorrectas. Verifica tu correo y contraseña.';
        } else if (error.status === 403) {
          this.errorMessage =
            'No tienes permiso para acceder al panel de administración.';
        } else {
          this.errorMessage =
            'Error en el servidor. Inténtalo nuevamente más tarde.';
        }
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Getters para acceder fácilmente a los controles del formulario
  get emailControl(): FormControl {
    return this.loginForm.get('email') as FormControl;
  }
  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }
}
