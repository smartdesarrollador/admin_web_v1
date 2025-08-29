import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar si el usuario está autenticado
    if (authService.isAuthenticated()) {
      // Obtener el usuario actual
      const currentUser = authService.currentUser();

      // Verificar si existe un usuario y tiene un rol permitido
      if (currentUser && allowedRoles.includes(currentUser.rol)) {
        return true;
      } else {
        // Si está autenticado pero no tiene el rol requerido, redirigir al dashboard
        router.navigate(['/admin/dashboard'], {
          queryParams: {
            error:
              'Acceso denegado: No tienes permisos para acceder a esta sección',
          },
        });
        return false;
      }
    }

    // Redireccionar al login si el usuario no está autenticado
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  };
};
