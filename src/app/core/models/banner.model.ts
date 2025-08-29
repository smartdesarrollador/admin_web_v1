export interface Banner {
  id: number;
  titulo: string;
  descripcion: string;
  imagen: string;
  texto_boton: string;
  enlace_boton: string;
  orden: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BannerListResponse {
  data: Banner[];
}

export interface BannerResponse {
  data: Banner;
}
