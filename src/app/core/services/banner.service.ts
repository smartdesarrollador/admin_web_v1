import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Banner,
  BannerListResponse,
  BannerResponse,
} from '../models/banner.model';

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  private apiUrl = `${environment.apiUrl}/banners`;
  private adminApiUrl = `${environment.apiUrl}/admin/banners`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los banners activos
   * @returns Lista de banners
   */
  getAllBanners(): Observable<Banner[]> {
    return this.http.get<BannerListResponse>(this.apiUrl).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error('Error al obtener banners', error);
        return throwError(
          () =>
            new Error(
              'Error al obtener banners. Por favor, inténtelo de nuevo.'
            )
        );
      })
    );
  }

  /**
   * Obtiene todos los banners (activos e inactivos) para administración
   * @returns Lista completa de banners
   */
  getAllBannersAdmin(): Observable<Banner[]> {
    return this.http.get<BannerListResponse>(this.adminApiUrl).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error('Error al obtener banners administrativos', error);
        return throwError(
          () =>
            new Error(
              'Error al obtener los banners. Por favor, inténtelo de nuevo.'
            )
        );
      })
    );
  }

  /**
   * Obtiene un banner específico por su ID
   * @param id ID del banner
   * @returns El banner solicitado
   */
  getBannerById(id: number): Observable<Banner> {
    return this.http.get<BannerResponse>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error(`Error al obtener banner con ID ${id}`, error);
        return throwError(
          () =>
            new Error(
              'Error al obtener el banner. Por favor, inténtelo de nuevo.'
            )
        );
      })
    );
  }

  /**
   * Crea un nuevo banner
   * @param banner Datos del nuevo banner
   * @param imagen Archivo de imagen del banner
   * @returns El banner creado
   */
  createBanner(banner: Partial<Banner>, imagen: File): Observable<Banner> {
    const formData = new FormData();

    // Añadir todos los campos al formData, con conversión explícita para boolean
    if (banner.titulo !== undefined) formData.append('titulo', banner.titulo);
    if (banner.descripcion !== undefined)
      formData.append('descripcion', banner.descripcion);
    if (banner.texto_boton !== undefined)
      formData.append('texto_boton', banner.texto_boton);
    if (banner.enlace_boton !== undefined)
      formData.append('enlace_boton', banner.enlace_boton);
    if (banner.orden !== undefined)
      formData.append('orden', String(banner.orden));

    // Convertir explícitamente boolean a string para compatibilidad con PHP
    if (banner.activo !== undefined) {
      formData.append('activo', banner.activo ? '1' : '0');
    }

    // Añadir la imagen asegurándonos que es un archivo válido
    if (imagen instanceof File) {
      formData.append('imagen', imagen, imagen.name);

      // Mostrar en consola para debug
      console.log('Enviando imagen:', imagen.name, imagen.type, imagen.size);
    } else {
      console.error('La imagen no es un archivo válido');
    }

    // Mostrar formData para debug
    console.log('Campos enviados:');
    formData.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });

    // Configurar encabezados para multipart/form-data
    const headers = new HttpHeaders();
    // No establecer Content-Type, el navegador lo establece automáticamente con el boundary

    return this.http
      .post<BannerResponse>(this.apiUrl, formData, { headers })
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('Error al crear el banner', error);
          if (error.error && error.error.errors) {
            console.error('Detalles de validación:', error.error.errors);
          }
          return throwError(
            () =>
              new Error(
                'Error al crear el banner. Por favor, inténtelo de nuevo.'
              )
          );
        })
      );
  }

  /**
   * Actualiza un banner existente
   * @param id ID del banner a actualizar
   * @param banner Nuevos datos para el banner
   * @param imagen Nueva imagen (opcional)
   * @returns El banner actualizado
   */
  updateBanner(
    id: number,
    banner: Partial<Banner>,
    imagen?: File
  ): Observable<Banner> {
    // Para el caso de solo actualizar activo, obtenemos primero el banner completo
    if (Object.keys(banner).length === 1 && 'activo' in banner) {
      return this.getBannerById(id).pipe(
        switchMap((bannerCompleto) => {
          // Tomamos el banner completo y solo actualizamos el estado activo
          const formData = new FormData();
          formData.append('activo', banner.activo ? '1' : '0');
          formData.append('titulo', bannerCompleto.titulo);
          formData.append('descripcion', bannerCompleto.descripcion || '');
          formData.append('texto_boton', bannerCompleto.texto_boton);
          formData.append('enlace_boton', bannerCompleto.enlace_boton);
          formData.append('orden', String(bannerCompleto.orden));

          // No enviamos la imagen porque no es necesario actualizarla

          return this.http
            .post<BannerResponse>(`${this.adminApiUrl}/${id}`, formData)
            .pipe(
              map((response) => response.data),
              catchError((error) => {
                console.error(`Error al actualizar banner con ID ${id}`, error);
                return throwError(
                  () =>
                    new Error(
                      'Error al actualizar el banner. Por favor, inténtelo de nuevo.'
                    )
                );
              })
            );
        }),
        catchError((error) => {
          console.error(
            `Error al obtener banner para actualizar con ID ${id}`,
            error
          );
          return throwError(
            () =>
              new Error(
                'Error al actualizar el banner. No se pudo obtener la información completa.'
              )
          );
        })
      );
    }

    // Para actualizaciones completas
    const formData = new FormData();

    // Añadir todos los campos al formData
    Object.keys(banner).forEach((key) => {
      if (banner[key as keyof Partial<Banner>] !== undefined) {
        // Convertir booleanos a '1' o '0' para PHP
        if (key === 'activo' && typeof banner[key] === 'boolean') {
          formData.append(key, banner[key] ? '1' : '0');
        } else {
          formData.append(key, String(banner[key as keyof Partial<Banner>]));
        }
      }
    });

    // Añadir la imagen si existe
    if (imagen) {
      formData.append('imagen', imagen, imagen.name);
    }

    return this.http
      .post<BannerResponse>(`${this.adminApiUrl}/${id}`, formData)
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error(`Error al actualizar banner con ID ${id}`, error);
          return throwError(
            () =>
              new Error(
                'Error al actualizar el banner. Por favor, inténtelo de nuevo.'
              )
          );
        })
      );
  }

  /**
   * Elimina un banner
   * @param id ID del banner a eliminar
   * @returns Mensaje de confirmación
   */
  deleteBanner(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error al eliminar banner con ID ${id}`, error);
        return throwError(
          () =>
            new Error(
              'Error al eliminar el banner. Por favor, inténtelo de nuevo.'
            )
        );
      })
    );
  }

  /**
   * Activa o desactiva un banner
   * @param id ID del banner
   * @param activo Estado a establecer
   * @returns El banner actualizado
   */
  toggleActivo(id: number, activo: boolean): Observable<Banner> {
    // Convertir boolean a string para el formData
    const formData = new FormData();
    formData.append('activo', activo ? '1' : '0');

    return this.http
      .post<BannerResponse>(`${this.adminApiUrl}/${id}`, formData)
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error(
            `Error al cambiar estado del banner con ID ${id}`,
            error
          );
          return throwError(
            () =>
              new Error(
                'Error al cambiar el estado del banner. Por favor, inténtelo de nuevo.'
              )
          );
        })
      );
  }
}
