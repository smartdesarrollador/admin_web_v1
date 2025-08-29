import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BannerService } from '../../../../core/services/banner.service';
import { Banner } from '../../../../core/models/banner.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-banner-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './banner-list.component.html',
  styleUrls: ['./banner-list.component.css'],
})
export class BannerListComponent implements OnInit {
  private bannerService = inject(BannerService);

  banners = signal<Banner[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarBanners();
  }

  cargarBanners(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.bannerService.getAllBannersAdmin().subscribe({
      next: (data) => {
        this.banners.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar banners', err);
        this.error.set(
          'No se pudieron cargar los banners. Por favor, inténtelo de nuevo.'
        );
        this.isLoading.set(false);
      },
    });
  }

  toggleActivoBanner(banner: Banner): void {
    this.bannerService.toggleActivo(banner.id, !banner.activo).subscribe({
      next: (updatedBanner) => {
        // Actualizar el banner en la lista
        this.banners.update((banners) =>
          banners.map((b) => (b.id === updatedBanner.id ? updatedBanner : b))
        );
      },
      error: (err) => {
        console.error('Error al cambiar estado del banner', err);
        this.error.set(
          'Error al cambiar el estado del banner. Por favor, inténtelo de nuevo.'
        );
      },
    });
  }

  eliminarBanner(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar este banner?')) {
      this.bannerService.deleteBanner(id).subscribe({
        next: () => {
          // Eliminar el banner de la lista
          this.banners.update((banners) =>
            banners.filter((banner) => banner.id !== id)
          );
        },
        error: (err) => {
          console.error('Error al eliminar el banner', err);
          this.error.set(
            'Error al eliminar el banner. Por favor, inténtelo de nuevo.'
          );
        },
      });
    }
  }

  obtenerUrlImagen(rutaImagen: string): string {
    if (rutaImagen.startsWith('http')) {
      return rutaImagen;
    }
    return `${environment.urlDominioApi}/${rutaImagen}`;
  }
}
