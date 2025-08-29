import { Component, OnInit, inject, effect } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { RouterLinkActive } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { NgIf, AsyncPipe, NgStyle } from '@angular/common';
import { AuthService } from '../../core/auth/services/auth.service';
import { User } from '../../core/models/user.model';
import { HasRoleDirective } from '../../core/directives/has-role.directive';
import { ConfiguracionesService } from '../../core/services/configuraciones.service';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIf,
    HasRoleDirective,
    AsyncPipe,
    NgStyle,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  // Servicios inyectados
  private authService = inject(AuthService);
  private router = inject(Router);
  private configuracionesService = inject(ConfiguracionesService);

  // Estado del sidebar (oculto o visible)
  sidebarHidden = false;
  // Estado del dropdown de productos (abierto o cerrado)
  productosDropdownOpen = false;
  // Estado del dropdown de configuración (abierto o cerrado)
  configDropdownOpen = false;

  // Usuario actual
  currentUser: User | null = null;
  // URL de la imagen de perfil del usuario
  userProfileImage: string | null = null;

  // Configuraciones
  logoUrl: Observable<string>;
  colorPrimario: Observable<string>;
  colorSecundario: Observable<string>;

  constructor() {
    // Intentar obtener el usuario del token JWT primero
    this.currentUser = this.authService.getUserFromToken();

    // Si no se pudo obtener del token, usar el valor de la señal currentUser
    if (!this.currentUser) {
      this.currentUser = this.authService.currentUser();
    }

    // Cargar la imagen de perfil del usuario
    this.loadUserProfileImage();

    // Utilizamos effect para observar cambios en la señal currentUser
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.currentUser = user;
        this.loadUserProfileImage();
      }
    });

    // Cargar la URL del logo desde las configuraciones
    this.logoUrl = this.configuracionesService.getImagenUrl('logo_principal');

    // Cargar los colores desde las configuraciones
    this.colorPrimario = this.configuracionesService
      .getAllConfiguraciones()
      .pipe(map((configs) => configs['color_primario'] || '#3B82F6'));

    this.colorSecundario = this.configuracionesService
      .getAllConfiguraciones()
      .pipe(map((configs) => configs['color_secundario'] || '#10B981'));
  }

  ngOnInit(): void {
    // Si no hay usuario autenticado, redirigir al login
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
    }
  }

  // Método para cargar la imagen de perfil del usuario
  loadUserProfileImage(): void {
    if (!this.currentUser) return;

    // Obtener la URL base del entorno sin el sufijo '/api'
    const baseUrl = environment.urlRaiz.replace(/\/api$/, '');

    // Intentar cargar la imagen del usuario
    const userImage = new Image();
    userImage.onload = () => {
      // Si la imagen carga correctamente, usarla
      this.userProfileImage = `${baseUrl}/assets/images/profiles/${
        this.currentUser?.id
      }.jpg?t=${new Date().getTime()}`;
    };

    userImage.onerror = () => {
      // Si hay error al cargar la imagen, usar la imagen predeterminada
      this.userProfileImage = `${baseUrl}/assets/images/profiles/default.png`;
    };

    // Intentar cargar la imagen del usuario
    userImage.src = `${baseUrl}/assets/images/profiles/${this.currentUser.id}.jpg`;
  }

  // Método para alternar la visibilidad del sidebar
  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;
  }

  // Método para alternar la visibilidad del dropdown de productos
  toggleProductosDropdown() {
    this.productosDropdownOpen = !this.productosDropdownOpen;
  }

  // Método para alternar la visibilidad del dropdown de configuración
  toggleConfigDropdown() {
    this.configDropdownOpen = !this.configDropdownOpen;
  }

  // Método para cerrar todos los dropdowns
  closeAllDropdowns() {
    this.productosDropdownOpen = false;
    this.configDropdownOpen = false;
  }

  // Método para cerrar sesión
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
        // Incluso si hay un error, intentamos navegar al login
        this.router.navigate(['/auth/login']);
      },
    });
  }
}
