import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import {
  UsuariosService,
  PaginationInfo,
  UserFilters,
} from '../../../core/services/usuarios.service';
import { User } from '../../../core/models/user.model';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { environment } from '../../../../environments/environment';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HasRoleDirective,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);

  // Estados del componente
  usuarios = signal<User[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  pagination = signal<PaginationInfo | null>(null);

  // Controles de filtros reactivos
  searchControl = new FormControl('');
  rolControl = new FormControl('');

  // Filtros actuales
  filters = signal<UserFilters>({
    page: 1,
    per_page: 10,
    search: '',
    rol: '',
  });

  // Estado para confirmación de eliminación
  usuarioAEliminar: number | null = null;

  // URL base para imágenes
  baseUrl = environment.urlRaiz.replace(/\/api$/, '');
  defaultImageUrl = ''; // URL de la imagen por defecto

  // Roles disponibles para filtrar
  roles = ['administrador', 'autor', 'cliente'];

  constructor() {
    // Efecto para recargar usuarios cuando cambian los filtros
    effect(
      () => {
        const currentFilters = this.filters();
        this.cargarUsuariosDesdeEffect(currentFilters);
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    // Inicializar la imagen por defecto
    this.defaultImageUrl = `${this.baseUrl}/assets/images/profiles/default.png`;

    // Configurar las suscripciones para búsqueda reactiva
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.actualizarFiltros({ search: value || '', page: 1 });
      });

    this.rolControl.valueChanges.subscribe((value) => {
      this.actualizarFiltros({ rol: value || '', page: 1 });
    });
  }

  /**
   * Actualiza los filtros manteniendo los valores existentes
   * @param newFilters Nuevos filtros a aplicar
   */
  actualizarFiltros(newFilters: Partial<UserFilters>): void {
    this.filters.update((current) => ({
      ...current,
      ...newFilters,
    }));
  }

  /**
   * Método interno para cargar usuarios desde el effect
   * Evitamos problemas con las signals permitiendo escrituras explícitamente
   */
  private cargarUsuariosDesdeEffect(filters: UserFilters): void {
    this.cargarUsuarios(filters);
  }

  /**
   * Carga la lista de usuarios desde la API con los filtros aplicados
   */
  cargarUsuarios(filters: UserFilters): void {
    this.loading.set(true);
    this.error.set(null);

    this.usuariosService.getUsuarios(filters).subscribe({
      next: (response) => {
        console.log('Respuesta del backend:', response);
        if (response.data && response.data.data) {
          this.usuarios.set(response.data.data);
          this.pagination.set(response.data.pagination);
        } else {
          console.error('Formato de respuesta inesperado:', response);
          this.error.set('Error: Formato de respuesta inesperado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.error.set(
          'Error al cargar la lista de usuarios. Intente nuevamente.'
        );
        this.loading.set(false);
      },
    });
  }

  /**
   * Cambia a la página especificada
   * @param page Número de página
   */
  irAPagina(page: number): void {
    const pagination = this.pagination();
    if (!pagination) return;

    if (page < 1 || page > (pagination.last_page || 1)) {
      return;
    }
    this.actualizarFiltros({ page });
  }

  /**
   * Limpia todos los filtros aplicados
   */
  limpiarFiltros(): void {
    this.searchControl.setValue('');
    this.rolControl.setValue('');
    this.actualizarFiltros({
      search: '',
      rol: '',
      page: 1,
    });
  }

  /**
   * Prepara la confirmación para eliminar un usuario
   * @param id ID del usuario a eliminar
   */
  confirmarEliminar(id: number): void {
    this.usuarioAEliminar = id;
  }

  /**
   * Cancela la eliminación de un usuario
   */
  cancelarEliminar(): void {
    this.usuarioAEliminar = null;
  }

  /**
   * Elimina un usuario
   */
  eliminarUsuario(): void {
    if (!this.usuarioAEliminar) return;

    this.loading.set(true);

    this.usuariosService.eliminarUsuario(this.usuarioAEliminar).subscribe({
      next: () => {
        // Recargar la lista de usuarios después de eliminar
        this.cargarUsuarios(this.filters());
        this.usuarioAEliminar = null;
      },
      error: (err) => {
        console.error('Error al eliminar usuario:', err);
        this.error.set('Error al eliminar el usuario. Intente nuevamente.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Obtiene la URL de la imagen de perfil de un usuario
   * @param user Usuario
   * @returns URL de la imagen de perfil
   */
  getProfileImageUrl(user: User): string {
    return `${this.baseUrl}/assets/images/profiles/${user.id}.jpg`;
  }

  /**
   * Maneja el error de carga de una imagen
   * @param event Evento de error
   */
  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = this.defaultImageUrl;
    }
  }

  /**
   * Genera un array con los números de página para la paginación
   */
  getPaginationRange(): number[] {
    const pagination = this.pagination();
    if (!pagination) return [];

    const currentPage = pagination.current_page || 1;
    const lastPage = pagination.last_page || 1;

    if (lastPage <= 1) return [1];

    const delta = 2;
    const range: number[] = [];

    for (
      let i = Math.max(1, currentPage - delta);
      i <= Math.min(lastPage, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    // Añadir primera página si no está incluida
    if (range[0] > 1) {
      range.unshift(1);
      if (range[1] > 2) range.splice(1, 0, -1); // Añadir elipsis
    }

    // Añadir última página si no está incluida
    if (range[range.length - 1] < lastPage) {
      if (range[range.length - 1] < lastPage - 1) range.push(-1); // Añadir elipsis
      range.push(lastPage);
    }

    return range;
  }
}
