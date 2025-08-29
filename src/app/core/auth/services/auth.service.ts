import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../http/api.service';
import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  TokenData,
} from '../../models/auth.model';
import { Observable, catchError, map, of, tap, switchMap } from 'rxjs';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  // Roles permitidos en el panel de administración
  private readonly ALLOWED_ROLES = ['administrador', 'autor'];

  private apiService = inject(ApiService);
  private router = inject(Router);

  // Signals
  isAuthenticated = signal<boolean>(this.hasValidToken());
  currentUser = signal<User | null>(this.getUserFromStorage());

  login(credentials: LoginCredentials): Observable<boolean> {
    return this.apiService.post<AuthResponse>('auth/login', credentials).pipe(
      switchMap((response) => {
        if (response.status === 'success') {
          // Primero guardamos el token para poder hacer la siguiente petición autenticada
          this.storeToken(response.data.authorization);

          // Verificamos el acceso al panel admin
          return this.verifyAdminAccess().pipe(
            tap((hasAccess) => {
              if (hasAccess) {
                // Primero intentamos obtener el usuario del token
                const userFromToken = this.getUserFromToken();
                if (userFromToken) {
                  this.storeUser(userFromToken);
                  this.currentUser.set(userFromToken);
                } else {
                  // Si no hay datos en el token, usamos los de la respuesta
                  this.storeUser(response.data.user);
                  this.currentUser.set(response.data.user);
                }
                this.isAuthenticated.set(true);
              } else {
                // Si no tiene acceso, limpiamos la autenticación
                this.clearAuth();
                throw new Error(
                  'Acceso denegado: No tienes permisos para acceder al panel de administración'
                );
              }
            }),
            map(() => true)
          );
        }
        return of(false);
      }),
      catchError((error) => {
        console.error('Error de inicio de sesión:', error);
        this.clearAuth();
        throw error;
      })
    );
  }

  // Verifica en el servidor si el usuario tiene acceso al panel admin
  verifyAdminAccess(): Observable<boolean> {
    return this.apiService.get<any>('auth/check-admin-access').pipe(
      map((response) => response.status === 'success'),
      catchError((error) => {
        console.error('Error verificando el acceso:', error);
        return of(false);
      })
    );
  }

  // Verifica si el rol del usuario está permitido en el panel admin
  isAllowedRole(rol: string): boolean {
    return this.ALLOWED_ROLES.includes(rol);
  }

  register(userData: RegisterData): Observable<boolean> {
    return this.apiService.post<AuthResponse>('auth/register', userData).pipe(
      switchMap((response) => {
        if (response.status === 'success') {
          // Guardamos el token para la siguiente petición
          this.storeToken(response.data.authorization);

          // Verificamos el acceso al panel admin
          return this.verifyAdminAccess().pipe(
            tap((hasAccess) => {
              if (hasAccess) {
                // Primero intentamos obtener el usuario del token
                const userFromToken = this.getUserFromToken();
                if (userFromToken) {
                  this.storeUser(userFromToken);
                  this.currentUser.set(userFromToken);
                } else {
                  // Si no hay datos en el token, usamos los de la respuesta
                  this.storeUser(response.data.user);
                  this.currentUser.set(response.data.user);
                }
                this.isAuthenticated.set(true);
              } else {
                // Si no tiene acceso, limpiamos la autenticación
                this.clearAuth();
                throw new Error(
                  'Acceso denegado: No tienes permisos para acceder al panel de administración'
                );
              }
            }),
            map(() => true)
          );
        }
        return of(false);
      }),
      catchError((error) => {
        console.error('Error en registro:', error);
        // No limpiamos la autenticación en caso de errores de validación
        // Solo lo hacemos si hay un error de autenticación
        if (error.status !== 422) {
          this.clearAuth();
        }
        throw error;
      })
    );
  }

  logout(): Observable<boolean> {
    // Solo si el usuario está autenticado, intentamos logout en la API
    if (this.isAuthenticated()) {
      return this.apiService.post<any>('auth/logout', {}).pipe(
        tap(() => this.clearAuth()),
        map(() => true),
        catchError(() => {
          // Incluso si falla el logout en el servidor, limpiamos localmente
          this.clearAuth();
          return of(true);
        })
      );
    } else {
      // Si no está autenticado, solo limpiamos localmente
      this.clearAuth();
      return of(true);
    }
  }

  refreshToken(): Observable<boolean> {
    return this.apiService.post<AuthResponse>('auth/refresh', {}).pipe(
      switchMap((response) => {
        if (response.status === 'success') {
          this.storeToken(response.data.authorization);

          // Verificar el acceso al panel admin después de refrescar el token
          return this.verifyAdminAccess().pipe(
            tap((hasAccess) => {
              if (!hasAccess) {
                this.clearAuth();
                throw new Error(
                  'Acceso denegado: No tienes permisos para acceder al panel de administración'
                );
              }
            }),
            map(() => true)
          );
        }
        return of(false);
      }),
      catchError(() => {
        this.clearAuth();
        return of(false);
      })
    );
  }

  loadProfile(): Observable<User | null> {
    return this.apiService.get<AuthResponse>('auth/profile').pipe(
      tap((response) => {
        if (response.status === 'success' && response.data.user) {
          // Verificar si el rol del usuario sigue siendo permitido
          if (!this.isAllowedRole(response.data.user.rol)) {
            this.clearAuth();
            this.router.navigate(['/auth/login'], {
              queryParams: {
                error:
                  'Acceso denegado: Tu rol no tiene permiso para acceder al panel de administración',
              },
            });
            throw new Error(
              'Acceso denegado: Tu rol no tiene permiso para acceder al panel de administración'
            );
          }

          this.storeUser(response.data.user);
          this.currentUser.set(response.data.user);
        }
      }),
      map((response) => response.data.user),
      catchError(() => of(null))
    );
  }

  /**
   * Solicitar enlace de recuperación de contraseña
   * @param email Correo electrónico del usuario
   */
  forgotPassword(email: string): Observable<any> {
    return this.apiService.post<any>('auth/forgot-password', { email }).pipe(
      map((response) => response),
      catchError((error) => {
        console.error('Error enviando correo de recuperación:', error);
        throw error;
      })
    );
  }

  /**
   * Validar token de recuperación de contraseña
   * @param token Token de recuperación
   * @param email Correo electrónico del usuario
   */
  validateResetToken(token: string, email: string): Observable<any> {
    return this.apiService
      .post<any>('auth/validate-reset-token', { token, email })
      .pipe(
        map((response) => response),
        catchError((error) => {
          console.error('Error validando token:', error);
          throw error;
        })
      );
  }

  /**
   * Restablecer contraseña con token
   * @param data Datos para restablecer contraseña
   */
  resetPassword(data: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Observable<any> {
    return this.apiService.post<any>('auth/reset-password', data).pipe(
      map((response) => response),
      catchError((error) => {
        console.error('Error restableciendo contraseña:', error);
        throw error;
      })
    );
  }

  private clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private storeToken(tokenData: TokenData): void {
    localStorage.setItem(
      this.TOKEN_KEY,
      JSON.stringify({
        ...tokenData,
        expires_at: new Date().getTime() + tokenData.expires_in * 1000,
      })
    );
  }

  private storeUser(user: User | null): void {
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  getToken(): string | null {
    const tokenJson = localStorage.getItem(this.TOKEN_KEY);
    if (!tokenJson) return null;

    const tokenData = JSON.parse(tokenJson);
    return tokenData.access_token;
  }

  private getUserFromStorage(): User | null {
    // Intentar primero obtener del token (prioridad)
    const userFromToken = this.getUserFromToken();
    if (userFromToken) {
      // Verificar si el rol es permitido
      if (!this.isAllowedRole(userFromToken.rol)) {
        this.clearAuth();
        return null;
      }
      return userFromToken;
    }

    // Si no hay datos en el token, intentar obtener del almacenamiento
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;

    const user = JSON.parse(userJson);
    // Verificar si el rol es permitido
    if (!this.isAllowedRole(user.rol)) {
      this.clearAuth();
      return null;
    }

    return user;
  }

  private hasValidToken(): boolean {
    const tokenJson = localStorage.getItem(this.TOKEN_KEY);
    if (!tokenJson) return false;

    try {
      const tokenData = JSON.parse(tokenJson);
      // Comprobar si el token ha expirado
      if (tokenData.expires_at && new Date().getTime() > tokenData.expires_at) {
        this.clearAuth();
        return false;
      }

      // Verificar si el usuario asociado al token tiene un rol permitido
      const user = this.getUserFromToken();
      if (user && !this.isAllowedRole(user.rol)) {
        this.clearAuth();
        return false;
      }

      return true;
    } catch (e) {
      this.clearAuth();
      return false;
    }
  }

  /**
   * Obtiene información del usuario decodificando el token JWT
   */
  getUserFromToken(): User | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded: any = jwtDecode(token);

      // Verificar que el token contiene la información del usuario
      if (
        decoded &&
        decoded.id &&
        decoded.email &&
        decoded.name &&
        decoded.rol
      ) {
        return {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          rol: decoded.rol,
          created_at: decoded.created_at || '',
          updated_at: decoded.updated_at || '',
        };
      }
      return null;
    } catch (e) {
      console.error('Error decodificando token:', e);
      return null;
    }
  }
}
