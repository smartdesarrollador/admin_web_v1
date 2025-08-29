import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BannerService } from '../../../../core/services/banner.service';
import { Banner } from '../../../../core/models/banner.model';

@Component({
  selector: 'app-banner-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './banner-create.component.html',
  styleUrls: ['./banner-create.component.css'],
})
export class BannerCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private bannerService = inject(BannerService);

  bannerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Variable para almacenar el archivo de imagen
  imagenSeleccionada: File | null = null;
  previewImagen: string | null = null;

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  inicializarFormulario(): void {
    this.bannerForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: [''],
      texto_boton: ['', [Validators.required, Validators.maxLength(50)]],
      enlace_boton: [
        '',
        [
          Validators.required,
          Validators.pattern(
            '(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?'
          ),
        ],
      ],
      orden: [0, [Validators.required, Validators.min(0)]],
      activo: [true],
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length) {
      const file = input.files[0];
      this.imagenSeleccionada = file;

      // Crear una URL para la vista previa
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImagen = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.bannerForm.invalid || !this.imagenSeleccionada) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.bannerForm.controls).forEach((key) => {
        const control = this.bannerForm.get(key);
        control?.markAsTouched();
      });

      if (!this.imagenSeleccionada) {
        this.errorMessage = 'Debe seleccionar una imagen para el banner.';
      }

      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.bannerService
      .createBanner(this.bannerForm.value, this.imagenSeleccionada)
      .subscribe({
        next: (banner) => {
          this.isLoading = false;
          this.successMessage = `Banner "${banner.titulo}" creado exitosamente.`;

          // Redireccionar después de 1.5 segundos
          setTimeout(() => {
            this.router.navigate(['/admin/banners']);
          }, 1500);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            'Error al crear el banner. Verifique los datos e intente nuevamente.';
          console.error('Error al crear banner:', error);
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/admin/banners']);
  }

  // Funciones auxiliares para validaciones
  get f() {
    return this.bannerForm.controls;
  }

  esInvalido(campo: string): boolean {
    const control = this.bannerForm.get(campo);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  obtenerErrores(campo: string): string[] {
    const control = this.bannerForm.get(campo);
    const errores: string[] = [];

    if (!control || !control.errors || !(control.dirty || control.touched)) {
      return errores;
    }

    if (control.errors['required']) {
      errores.push('Este campo es obligatorio.');
    }

    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      errores.push(`Máximo ${maxLength} caracteres permitidos.`);
    }

    if (control.errors['pattern']) {
      errores.push('Ingrese una URL válida.');
    }

    if (control.errors['min']) {
      errores.push(`El valor mínimo es ${control.errors['min'].min}.`);
    }

    return errores;
  }
}
