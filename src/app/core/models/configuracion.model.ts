/**
 * Interfaz para los tipos de configuración soportados
 */
export type TipoConfiguracion =
  | 'texto'
  | 'color'
  | 'imagen'
  | 'json'
  | 'booleano'
  | 'numero';

/**
 * Interfaz que representa una configuración individual
 */
export interface Configuracion {
  id: number;
  clave: string;
  valor: string;
  valor_procesado: any; // Puede ser string, boolean, number o objeto JSON
  tipo: TipoConfiguracion;
  descripcion: string;
  grupo: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interfaz para la respuesta de la API con el listado de configuraciones
 */
export interface ConfiguracionListResponse {
  data: Configuracion[];
}

/**
 * Interfaz para la respuesta de configuraciones agrupadas
 */
export interface ConfiguracionesGruposResponse {
  grupos: string[];
  configuraciones: {
    [grupo: string]: Configuracion[];
  };
}

/**
 * Interfaz para enviar actualización de una configuración
 */
export interface ConfiguracionUpdateRequest {
  valor?: string;
  archivo?: File;
}

/**
 * Interfaz para actualizar múltiples configuraciones a la vez
 */
export interface ConfiguracionMultipleUpdateRequest {
  configuraciones: {
    id: number;
    valor: string;
  }[];
}

/**
 * Interfaz para el valor procesado de configuraciones tipo JSON
 */
export interface RedesSocialesConfig {
  facebook: string;
  twitter: string;
  instagram: string;
}

export interface GradienteColoresConfig {
  inicio: string;
  fin: string;
}

/**
 * Interfaz para la respuesta simplificada de configuraciones
 * donde todas las configuraciones se presentan como un objeto clave-valor
 */
export interface ConfiguracionesTodas {
  [clave: string]: any; // El tipo del valor dependerá del tipo de configuración
}
