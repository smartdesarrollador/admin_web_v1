import {
  Directive,
  Input,
  OnInit,
  ElementRef,
  inject,
  effect,
} from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { User } from '../models/user.model';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit {
  private authService = inject(AuthService);
  private element = inject(ElementRef);

  @Input() appHasRole: string | string[] = [];

  // Usar effect para reaccionar a cambios en la señal currentUser
  constructor() {
    effect(() => {
      this.updateElementVisibility(this.authService.currentUser());
    });
  }

  ngOnInit(): void {
    // Verificar al inicio con el usuario actual
    this.updateElementVisibility(this.authService.currentUser());
  }

  private updateElementVisibility(user: User | null): void {
    // Si no hay usuario o no hay roles especificados, ocultar el elemento
    if (!user || !this.appHasRole) {
      this.element.nativeElement.style.display = 'none';
      return;
    }

    // Convertir a array si es un string
    const allowedRoles = Array.isArray(this.appHasRole)
      ? this.appHasRole
      : [this.appHasRole];

    // Verificar si el usuario tiene al menos uno de los roles permitidos
    const hasRole = allowedRoles.includes(user.rol);

    // Mostrar u ocultar el elemento según corresponda
    this.element.nativeElement.style.display = hasRole ? '' : 'none';
  }
}
