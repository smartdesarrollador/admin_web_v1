import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.urlRaiz}`;
  private readonly TOKEN_KEY = 'auth_token';

  private getHeaders(): HttpHeaders {
    // Obtener el token JWT del localStorage
    const tokenJson = localStorage.getItem(this.TOKEN_KEY);
    let token = null;

    if (tokenJson) {
      try {
        const tokenData = JSON.parse(tokenJson);
        token = tokenData.access_token;
      } catch (e) {
        console.error('Error al parsear el token:', e);
      }
    }

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    // Si hay un token, añadirlo a las cabeceras
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}`, {
      headers: this.getHeaders(),
    });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}`, body, {
      headers: this.getHeaders(),
    });
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${path}`, body, {
      headers: this.getHeaders(),
    });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${path}`, {
      headers: this.getHeaders(),
    });
  }
}
