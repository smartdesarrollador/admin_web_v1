import { User } from './user.model';

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: User | null;
    authorization: {
      access_token: string;
      token_type: string;
      expires_in: number;
    };
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  rol: string;
}

export interface TokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
}
