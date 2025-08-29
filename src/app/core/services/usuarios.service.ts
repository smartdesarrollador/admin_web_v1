import { Injectable, inject } from '@angular/core';
import { ApiService } from '../http/api.service';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface PaginationInfo {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export interface UsersResponse {
  data: User[];
  pagination: PaginationInfo;
}

export interface UserFilters {
  search?: string;
  rol?: string;
  page?: number;
  per_page?: number;
}

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private apiService = inject(ApiService);

  /**
   * Obtener todos los usuarios con paginación y filtros
   * @param filters Filtros para la búsqueda
   * @returns Observable con la lista de usuarios paginada
   */
  getUsuarios(
    filters: UserFilters = {}
  ): Observable<ApiResponse<UsersResponse>> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.rol) params.append('rol', filters.rol);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page)
      params.append('per_page', filters.per_page.toString());

    const queryString = params.toString();
    const url = `users${queryString ? '?' + queryString : ''}`;

    return this.apiService.get<ApiResponse<UsersResponse>>(url);
  }

  /**
   * Obtener un usuario por su ID
   * @param id ID del usuario
   * @returns Observable con los datos del usuario
   */
  getUsuario(id: number): Observable<ApiResponse<User>> {
    return this.apiService.get<ApiResponse<User>>(`users/${id}`);
  }

  /**
   * Crear un nuevo usuario
   * @param usuario Datos del usuario a crear
   * @returns Observable con el usuario creado
   */
  crearUsuario(usuario: Partial<User>): Observable<ApiResponse<User>> {
    return this.apiService.post<ApiResponse<User>>('users', usuario);
  }

  /**
   * Actualizar un usuario existente
   * @param id ID del usuario
   * @param usuario Datos del usuario a actualizar
   * @returns Observable con el usuario actualizado
   */
  actualizarUsuario(
    id: number,
    usuario: Partial<User>
  ): Observable<ApiResponse<User>> {
    return this.apiService.put<ApiResponse<User>>(`users/${id}`, usuario);
  }

  /**
   * Eliminar un usuario
   * @param id ID del usuario a eliminar
   * @returns Observable con la respuesta de la API
   */
  eliminarUsuario(id: number): Observable<ApiResponse<null>> {
    return this.apiService.delete<ApiResponse<null>>(`users/${id}`);
  }
}
