import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfiguracionesService } from '../../../core/services/configuraciones.service';
import {
  Configuracion,
  ConfiguracionesGruposResponse,
  ConfiguracionMultipleUpdateRequest,
} from '../../../core/models/configuracion.model';
import { Observable, of, forkJoin } from 'rxjs';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';

// Interfaz para la previsualización de imágenes
interface ImagenPreview {
  src?: string;
  nombre: string;
}

@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HasRoleDirective],
  templateUrl: './configuraciones.component.html',
  styleUrls: ['./configuraciones.component.css'],
})
export class ConfiguracionesComponent implements OnInit {
  // Estado de carga y error
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  // Datos de configuraciones
  configuracionesPorGrupo?: ConfiguracionesGruposResponse;
  grupoSeleccionado: string = 'general';

  // Gestión de formularios
  editandoId: number | null = null;
  formConfiguracion: FormGroup;
  formConfiguracionesGrupo: { [grupo: string]: FormGroup } = {};

  // Caché de URLs de imágenes
  private imagenesUrls: { [clave: string]: string } = {};

  // Previsualización de imagen
  imagenPreview: ImagenPreview | null = null;

  // Para almacenar archivos de imagen pendientes de guardar
  private archivosImagenes: Map<number, File> = new Map();

  constructor(
    private configuracionesService: ConfiguracionesService,
    private fb: FormBuilder
  ) {
    this.formConfiguracion = this.fb.group({
      valor: ['', Validators.required],
      archivo: [null],
    });
  }

  ngOnInit(): void {
    this.cargarConfiguraciones();
  }

  /**
   * Carga las configuraciones agrupadas desde el servidor
   */
  cargarConfiguraciones(): void {
    this.loading = true;
    this.error = null;

    this.configuracionesService.getConfiguracionesPorGrupo().subscribe({
      next: (data) => {
        this.configuracionesPorGrupo = data;
        this.loading = false;

        // Inicializar formularios para cada grupo
        this.inicializarFormulariosPorGrupo();

        // Precarga las URLs de imágenes para todas las configuraciones de tipo imagen
        this.precargarImagenesUrls();
      },
      error: (err) => {
        this.error = err.message || 'Error al cargar las configuraciones';
        this.loading = false;
      },
    });
  }

  /**
   * Precarga las URLs de todas las imágenes para evitar llamadas múltiples
   */
  precargarImagenesUrls(): void {
    if (!this.configuracionesPorGrupo) return;

    // Recorre todos los grupos y configuraciones
    Object.values(this.configuracionesPorGrupo.configuraciones).forEach(
      (configs) => {
        configs.forEach((config) => {
          if (config.tipo === 'imagen') {
            // Obtiene y guarda en caché la URL de la imagen
            this.configuracionesService
              .getImagenUrl(config.clave)
              .subscribe((url) => {
                this.imagenesUrls[config.clave] = url;
              });
          }
        });
      }
    );
  }

  /**
   * Inicializa formularios para actualización en lote por grupo
   */
  inicializarFormulariosPorGrupo(): void {
    if (!this.configuracionesPorGrupo) return;

    this.configuracionesPorGrupo.grupos.forEach((grupo) => {
      const configuracionesGrupo =
        this.configuracionesPorGrupo?.configuraciones[grupo] || [];

      const formGroup: { [key: string]: any } = {};

      configuracionesGrupo.forEach((config) => {
        formGroup[`config_${config.id}`] = [config.valor];
      });

      this.formConfiguracionesGrupo[grupo] = this.fb.group(formGroup);
    });
  }

  /**
   * Selecciona un grupo para mostrar
   */
  seleccionarGrupo(grupo: string): void {
    this.grupoSeleccionado = grupo;
    // Limpiar la previsualización al cambiar de grupo
    this.imagenPreview = null;
  }

  /**
   * Inicia la edición de una configuración específica
   */
  editarConfiguracion(config: Configuracion): void {
    this.editandoId = config.id;
    this.formConfiguracion.patchValue({
      valor: config.valor,
      archivo: null,
    });
    // Limpiar la previsualización al editar otra configuración
    this.imagenPreview = null;
  }

  /**
   * Cancela la edición de una configuración
   */
  cancelarEdicion(): void {
    this.editandoId = null;
    this.formConfiguracion.reset();
    this.imagenPreview = null;
  }

  /**
   * Maneja el cambio de archivo en los inputs tipo file
   */
  onArchivoSeleccionado(event: Event, configId: number): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const archivo = input.files[0];
      this.editandoId = configId;
      this.formConfiguracion.patchValue({
        archivo: archivo,
      });

      // Guardar el archivo para procesarlo más tarde si se guarda el grupo
      this.archivosImagenes.set(configId, archivo);

      // Crear previsualización de la imagen
      this.mostrarPreviewImagen(archivo);

      // En lugar de auto-guardar, solo mostramos la vista previa
      // para permitir guardar varias imágenes juntas con el botón "Guardar configuraciones"
      // this.guardarConfiguracion();
    }
  }

  /**
   * Muestra una vista previa de la imagen seleccionada
   */
  private mostrarPreviewImagen(archivo: File): void {
    // Primero configuramos el nombre
    this.imagenPreview = {
      nombre: archivo.name,
    };

    // Solo creamos URL para imágenes que se pueden previsualizar
    if (archivo.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (this.imagenPreview) {
          this.imagenPreview.src = e.target.result;
        }
      };
      reader.readAsDataURL(archivo);
    }
  }

  /**
   * Guarda los cambios de una configuración individual
   */
  guardarConfiguracion(): void {
    if (this.formConfiguracion.invalid || this.editandoId === null) {
      return;
    }

    const { valor, archivo } = this.formConfiguracion.value;

    this.loading = true;

    // Usar subirImagen si hay archivo, de lo contrario usar updateConfiguracion
    if (archivo) {
      this.configuracionesService
        .subirImagen(this.editandoId, archivo)
        .subscribe({
          next: (respuesta) => {
            this.finalizarGuardado(respuesta);
          },
          error: (err) => this.manejarError(err),
        });
    } else {
      this.configuracionesService
        .updateConfiguracion(this.editandoId, { valor, archivo })
        .subscribe({
          next: (respuesta) => {
            this.finalizarGuardado(respuesta);
          },
          error: (err) => this.manejarError(err),
        });
    }
  }

  /**
   * Finaliza el proceso de guardado
   */
  private finalizarGuardado(respuesta: any): void {
    this.loading = false;
    this.successMessage = 'Configuración actualizada correctamente';
    this.configuracionesService.clearCache(); // Limpiar caché
    this.imagenesUrls = {}; // Limpiar caché de imágenes
    this.imagenPreview = null; // Limpiar previsualización
    this.archivosImagenes.clear(); // Limpiar archivos pendientes
    this.cargarConfiguraciones(); // Recargar datos
    this.cancelarEdicion();

    // Ocultar mensaje después de 3 segundos
    setTimeout(() => (this.successMessage = null), 3000);
  }

  /**
   * Maneja errores de las peticiones
   */
  private manejarError(err: any): void {
    this.loading = false;
    this.error = err.message || 'Error al actualizar la configuración';

    // Ocultar mensaje después de 3 segundos
    setTimeout(() => (this.error = null), 3000);
  }

  /**
   * Guarda todas las configuraciones de un grupo en lote
   */
  guardarGrupo(grupo: string): void {
    if (!this.formConfiguracionesGrupo[grupo]) return;

    const form = this.formConfiguracionesGrupo[grupo];
    if (form.invalid) return;

    this.loading = true;

    // Primero, verificamos si hay imágenes para subir
    const imagenesParaSubir = this.obtenerConfiguracionesImagenes(grupo);

    if (imagenesParaSubir.length > 0) {
      // Si hay imágenes, las subimos primero y luego el resto de configuraciones
      const observables = imagenesParaSubir.map((item) =>
        this.configuracionesService.subirImagen(item.id, item.archivo)
      );

      forkJoin(observables).subscribe({
        next: () => {
          // Una vez subidas las imágenes, guardamos el resto de valores
          this.guardarValoresDeGrupo(grupo);
        },
        error: (err) => this.manejarError(err),
      });
    } else {
      // Si no hay imágenes, guardamos directamente los valores
      this.guardarValoresDeGrupo(grupo);
    }
  }

  /**
   * Obtiene las configuraciones de imágenes para un grupo determinado
   */
  private obtenerConfiguracionesImagenes(
    grupo: string
  ): { id: number; archivo: File }[] {
    if (!this.configuracionesPorGrupo) return [];

    const configuracionesGrupo =
      this.configuracionesPorGrupo.configuraciones[grupo] || [];
    const imagenes: { id: number; archivo: File }[] = [];

    // Recorremos todas las configuraciones del grupo
    configuracionesGrupo.forEach((config) => {
      if (config.tipo === 'imagen' && this.archivosImagenes.has(config.id)) {
        const archivo = this.archivosImagenes.get(config.id);
        if (archivo) {
          imagenes.push({
            id: config.id,
            archivo: archivo,
          });
        }
      }
    });

    return imagenes;
  }

  /**
   * Guarda los valores de texto de las configuraciones de un grupo
   */
  private guardarValoresDeGrupo(grupo: string): void {
    const form = this.formConfiguracionesGrupo[grupo];
    const formValues = form.value;
    const configuraciones: { id: number; valor: string }[] = [];

    // Extraer valores del formulario
    Object.keys(formValues).forEach((key) => {
      if (key.startsWith('config_')) {
        const id = parseInt(key.replace('config_', ''));
        // Verificamos que esta configuración no sea una imagen que ya se subió
        if (!this.archivosImagenes.has(id)) {
          configuraciones.push({
            id,
            valor: formValues[key],
          });
        }
      }
    });

    // Solo actualizamos si hay configuraciones de texto para guardar
    if (configuraciones.length > 0) {
      const data: ConfiguracionMultipleUpdateRequest = { configuraciones };

      this.configuracionesService.updateMultiple(data).subscribe({
        next: (response) => {
          this.finalizarGuardadoGrupo(response.mensaje);
        },
        error: (err) => this.manejarError(err),
      });
    } else {
      // Si todas eran imágenes y ya se subieron, finalizamos el guardado
      this.finalizarGuardadoGrupo('Configuraciones actualizadas correctamente');
    }
  }

  /**
   * Finaliza el proceso de guardado de un grupo
   */
  private finalizarGuardadoGrupo(mensaje: string): void {
    this.loading = false;
    this.successMessage = mensaje;
    this.configuracionesService.clearCache(); // Limpiar caché
    this.imagenesUrls = {}; // Limpiar caché de imágenes
    this.archivosImagenes.clear(); // Limpiar archivos pendientes
    this.imagenPreview = null; // Limpiar previsualización
    this.cargarConfiguraciones(); // Recargar datos

    // Ocultar mensaje después de 3 segundos
    setTimeout(() => (this.successMessage = null), 3000);
  }

  /**
   * Verifica si la configuración es de tipo imagen
   */
  esImagen(tipo: string): boolean {
    return tipo === 'imagen';
  }

  /**
   * Verifica si la configuración es de tipo color
   */
  esColor(tipo: string): boolean {
    return tipo === 'color';
  }

  /**
   * Obtiene la URL de una imagen de configuración
   * @param clave La clave de la configuración de tipo imagen
   * @returns La URL de la imagen (o una URL vacía si no está disponible)
   */
  getImagenUrl(clave: string): string {
    // Devuelve la URL desde la caché si existe
    if (this.imagenesUrls[clave]) {
      return this.imagenesUrls[clave];
    }

    // Si no está en caché, devuelve una URL vacía
    // La imagen se actualizará cuando se complete la precarga
    return '';
  }
}
