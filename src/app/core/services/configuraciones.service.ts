import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Configuracion,
  ConfiguracionListResponse,
  ConfiguracionesGruposResponse,
  ConfiguracionUpdateRequest,
  ConfiguracionMultipleUpdateRequest,
  ConfiguracionesTodas,
} from '../models/configuracion.model';

@Injectable({
  providedIn: 'root',
})
export class ConfiguracionesService {
  private apiUrl = `${environment.apiUrl}/configuraciones`;
  private configuracionesCache$?: Observable<ConfiguracionesTodas>;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las configuraciones
   * @param grupo Filtrar configuraciones por grupo (opcional)
   * @returns Lista de configuraciones
   */
  getConfiguraciones(grupo?: string): Observable<Configuracion[]> {
    let params = new HttpParams();

    if (grupo) {
      params = params.set('grupo', grupo);
    }

    return this.http
      .get<ConfiguracionListResponse>(this.apiUrl, { params })
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('Error al obtener configuraciones', error);
          return throwError(
            () =>
              new Error(
                'Error al obtener configuraciones. Por favor, inténtelo de nuevo.'
              )
          );
        })
      );
  }

  /**
   * Obtiene configuraciones agrupadas por su categoría
   * @returns Objeto con los grupos y sus configuraciones
   */
  getConfiguracionesPorGrupo(): Observable<ConfiguracionesGruposResponse> {
    return this.http
      .get<ConfiguracionesGruposResponse>(`${this.apiUrl}/grupos`)
      .pipe(
        catchError((error) => {
          console.error('Error al obtener configuraciones por grupo', error);
          return throwError(
            () =>
              new Error(
                'Error al obtener configuraciones agrupadas. Por favor, inténtelo de nuevo.'
              )
          );
        })
      );
  }

  /**
   * Obtiene una configuración específica por su ID
   * @param id ID de la configuración
   * @returns La configuración solicitada
   */
  getConfiguracion(id: number): Observable<Configuracion> {
    return this.http.get<Configuracion>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error al obtener configuración con ID ${id}`, error);
        return throwError(
          () =>
            new Error(
              'Error al obtener la configuración. Por favor, inténtelo de nuevo.'
            )
        );
      })
    );
  }

  /**
   * Actualiza una configuración existente
   * @param id ID de la configuración a actualizar
   * @param data Nuevos datos para la configuración
   * @returns La configuración actualizada
   */
  updateConfiguracion(
    id: number,
    data: ConfiguracionUpdateRequest
  ): Observable<Configuracion> {
    // Si tenemos un archivo, enviamos como FormData
    if (data.archivo) {
      const formData = new FormData();
      formData.append('archivo', data.archivo);

      if (data.valor) {
        formData.append('valor', data.valor);
      }

      return this.http
        .put<Configuracion>(`${this.apiUrl}/${id}`, formData)
        .pipe(
          catchError((error) => {
            console.error(
              `Error al actualizar configuración con ID ${id}`,
              error
            );
            return throwError(
              () =>
                new Error(
                  'Error al actualizar la configuración. Por favor, inténtelo de nuevo.'
                )
            );
          })
        );
    }

    // Si no hay archivo, enviamos como JSON
    return this.http.put<Configuracion>(`${this.apiUrl}/${id}`, data).pipe(
      catchError((error) => {
        console.error(`Error al actualizar configuración con ID ${id}`, error);
        return throwError(
          () =>
            new Error(
              'Error al actualizar la configuración. Por favor, inténtelo de nuevo.'
            )
        );
      })
    );
  }

  /**
   * Sube una imagen para una configuración usando POST
   * @param id ID de la configuración
   * @param archivo Archivo de imagen a subir
   * @returns La configuración actualizada
   */
  subirImagen(id: number, archivo: File): Observable<Configuracion> {
    const formData = new FormData();
    formData.append('archivo', archivo);

    return this.http
      .post<Configuracion>(`${this.apiUrl}/${id}/imagen`, formData)
      .pipe(
        catchError((error) => {
          console.error(
            `Error al subir imagen para configuración con ID ${id}`,
            error
          );
          return throwError(
            () =>
              new Error(
                'Error al subir la imagen. Por favor, inténtelo de nuevo.'
              )
          );
        })
      );
  }

  /**
   * Actualiza múltiples configuraciones a la vez
   * @param data Objeto con las configuraciones a actualizar
   * @returns Mensaje de confirmación
   */
  updateMultiple(
    data: ConfiguracionMultipleUpdateRequest
  ): Observable<{ mensaje: string }> {
    return this.http
      .post<{ mensaje: string }>(`${this.apiUrl}/actualizar-multiple`, data)
      .pipe(
        catchError((error) => {
          console.error('Error al actualizar múltiples configuraciones', error);
          return throwError(
            () =>
              new Error(
                'Error al actualizar las configuraciones. Por favor, inténtelo de nuevo.'
              )
          );
        })
      );
  }

  /**
   * Obtiene todas las configuraciones como un objeto clave-valor
   * Con caché para evitar múltiples peticiones
   * @returns Objeto con todas las configuraciones
   */
  getAllConfiguraciones(): Observable<ConfiguracionesTodas> {
    if (!this.configuracionesCache$) {
      // URL pública sin autenticación
      const url = `${environment.apiUrl}/configuraciones/todas`;

      this.configuracionesCache$ = this.http
        .get<ConfiguracionesTodas>(url)
        .pipe(
          shareReplay(1),
          catchError((error) => {
            console.error('Error al obtener todas las configuraciones', error);
            this.configuracionesCache$ = undefined; // Resetear caché en caso de error
            return throwError(
              () =>
                new Error(
                  'Error al cargar la configuración del sitio. Por favor, recargue la página.'
                )
            );
          })
        );
    }

    return this.configuracionesCache$;
  }

  /**
   * Obtiene una URL para una imagen de configuración
   * @param clave La clave de la configuración de tipo imagen
   * @returns URL completa de la imagen
   */
  getImagenUrl(clave: string): Observable<string> {
    // Primero obtenemos la configuración para acceder a su valor (ruta de la imagen)
    return this.getAllConfiguraciones().pipe(
      map((configuraciones) => {
        // Verificamos si la configuración existe
        if (configuraciones && configuraciones[clave]) {
          // Usamos la ruta almacenada en la base de datos (valor)
          const rutaImagen = configuraciones[clave];
          // Construimos la URL completa
          return `${environment.urlDominioApi}/${rutaImagen}`;
        }
        console.error(`Configuración de imagen "${clave}" no encontrada`);
        return ''; // Retornamos string vacío si no se encuentra
      }),
      catchError((error) => {
        console.error(
          `Error al obtener la imagen para la clave ${clave}`,
          error
        );
        return of(''); // Retornamos string vacío en caso de error
      })
    );
  }

  /**
   * Método para limpiar la caché de configuraciones,
   * útil después de actualizar configuraciones
   */
  clearCache(): void {
    this.configuracionesCache$ = undefined;
  }
}
