import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BannerService } from '../../../../core/services/banner.service';
import { Banner } from '../../../../core/models/banner.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-banner-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './banner-edit.component.html',
  styleUrls: ['./banner-edit.component.css'],
})
export class BannerEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private bannerService = inject(BannerService);

  bannerForm!: FormGroup;
  isLoading = false;
  isLoadingData = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  bannerId!: number;
  currentBanner: Banner | null = null;

  // Variable para almacenar el archivo de imagen
  imagenSeleccionada: File | null = null;
  previewImagen: string | null = null;
  imagenActual: string | null = null;

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarBanner();
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

  cargarBanner(): void {
    // Obtener el ID del banner desde la ruta
    this.route.params.subscribe((params) => {
      this.bannerId = +params['id']; // Convertir a número

      if (!this.bannerId || isNaN(this.bannerId)) {
        this.errorMessage = 'ID de banner inválido';
        this.isLoadingData = false;
        return;
      }

      // Cargar los datos del banner
      this.bannerService.getBannerById(this.bannerId).subscribe({
        next: (banner) => {
          this.currentBanner = banner;
          this.cargarDatosEnFormulario(banner);
          this.isLoadingData = false;
        },
        error: (err) => {
          console.error('Error al cargar el banner', err);
          this.errorMessage =
            'No se pudo cargar la información del banner. Por favor, inténtelo de nuevo.';
          this.isLoadingData = false;
        },
      });
    });
  }

  cargarDatosEnFormulario(banner: Banner): void {
    this.bannerForm.patchValue({
      titulo: banner.titulo,
      descripcion: banner.descripcion,
      texto_boton: banner.texto_boton,
      enlace_boton: banner.enlace_boton,
      orden: banner.orden,
      activo: banner.activo,
    });

    // Establecer la imagen actual para mostrar la vista previa
    this.imagenActual = banner.imagen;
    this.previewImagen = this.obtenerUrlImagen(banner.imagen);
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

  obtenerUrlImagen(rutaImagen: string): string {
    if (rutaImagen.startsWith('http')) {
      return rutaImagen;
    }
    return `${environment.urlDominioApi}/${rutaImagen}`;
  }

  onSubmit(): void {
    // Marcar todos los campos como tocados para mostrar posibles errores
    Object.keys(this.bannerForm.controls).forEach((key) => {
      const control = this.bannerForm.get(key);
      control?.markAsTouched();
    });

    // Permitir el envío aunque haya errores de validación
    // ya que los datos originales podrían ser válidos

    this.isLoading = true;
    this.errorMessage = null;

    this.bannerService
      .updateBanner(
        this.bannerId,
        this.bannerForm.value,
        this.imagenSeleccionada || undefined
      )
      .subscribe({
        next: (banner) => {
          this.isLoading = false;
          this.successMessage = `Banner "${banner.titulo}" actualizado exitosamente.`;

          // Redireccionar después de 1.5 segundos
          setTimeout(() => {
            this.router.navigate(['/admin/banners']);
          }, 1500);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            'Error al actualizar el banner. Verifique los datos e intente nuevamente.';
          console.error('Error al actualizar banner:', error);
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/admin/banners']);
  }

  eliminarImagenSeleccionada(): void {
    this.imagenSeleccionada = null;
    this.previewImagen = this.imagenActual
      ? this.obtenerUrlImagen(this.imagenActual)
      : null;

    // Resetear el input de archivo
    const fileInput = document.getElementById('imagen') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
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
