import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si el usuario está autenticado
  if (authService.isAuthenticated()) {
    // Obtener el usuario actual
    const currentUser = authService.currentUser();

    // Verificar si existe un usuario y tiene un rol permitido
    if (currentUser && authService.isAllowedRole(currentUser.rol)) {
      return true;
    } else {
      // Si está autenticado pero no tiene un rol permitido, cerrar sesión y redirigir
      authService.logout().subscribe();
      router.navigate(['/auth/login'], {
        queryParams: {
          error:
            'Acceso denegado: No tienes permisos para acceder al panel de administración',
        },
      });
      return false;
    }
  }

  // Redireccionar al login si el usuario no está autenticado
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
