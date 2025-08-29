import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe, NgStyle } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ConfiguracionesService } from '../../../core/services/configuraciones.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AsyncPipe, NgStyle],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  // Servicios inyectados
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private configuracionesService = inject(ConfiguracionesService);

  // Estado del formulario
  registerForm: FormGroup;
  errorMessage: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  // Configuraciones
  logoUrl: Observable<string>;
  colorPrimario: Observable<string>;
  colorSecundario: Observable<string>;
  colorGradiente: Observable<string>;

  constructor() {
    // Inicializar formulario
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
            ),
          ],
        ],
        password_confirmation: ['', [Validators.required]],
        rol: ['autor', Validators.required],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

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
    // Ya no necesitamos verificar la autenticación aquí
    // porque el componente está dentro del panel de administración
    // protegido por authGuard
  }

  // Validator personalizado para comprobar que las contraseñas coinciden
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('password_confirmation');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Limpiar el error de contraseñas no coincidentes si ya coinciden
      if (confirmPassword.errors) {
        const { passwordMismatch, ...otherErrors } = confirmPassword.errors;
        confirmPassword.setErrors(
          Object.keys(otherErrors).length ? otherErrors : null
        );
      }
      return null;
    }
  }

  // Getters para acceder fácilmente a los controles del formulario
  get nameControl(): FormControl {
    return this.registerForm.get('name') as FormControl;
  }

  get emailControl(): FormControl {
    return this.registerForm.get('email') as FormControl;
  }

  get passwordControl(): FormControl {
    return this.registerForm.get('password') as FormControl;
  }

  get passwordConfirmationControl(): FormControl {
    return this.registerForm.get('password_confirmation') as FormControl;
  }

  get rolControl(): FormControl {
    return this.registerForm.get('rol') as FormControl;
  }

  // Método para mostrar/ocultar la contraseña
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Método para mostrar/ocultar la confirmación de contraseña
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Método para enviar el formulario
  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Enviar todos los datos del formulario, incluyendo password_confirmation
    const userData = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: () => {
        this.isLoading = false;
        // Redirigir al dashboard o a la pantalla de inicio de sesión
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al registrar:', error);

        if (error.error && error.error.errors) {
          // Mostrar errores específicos de validación
          if (error.error.errors.password) {
            this.errorMessage = error.error.errors.password[0];
          } else if (error.error.errors.email) {
            this.errorMessage = error.error.errors.email[0];
          } else {
            this.errorMessage = 'Error de validación en el formulario.';
          }
        } else if (
          error.error &&
          error.error.message === 'La dirección de correo ya está en uso'
        ) {
          this.errorMessage =
            'Este correo electrónico ya está registrado. Por favor, utiliza otro o inicia sesión.';
        } else {
          this.errorMessage =
            'Error al crear la cuenta. Por favor, inténtalo de nuevo.';
        }
      },
    });
  }
}
