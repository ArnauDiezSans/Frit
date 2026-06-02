import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL  } from '../../core/api/api.config';
import { UsuarioOption } from './juegos.models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/usuarios`;

  getAll(): Observable<UsuarioOption[]> {
    return this.http.get<UsuarioOption[]>(this.baseUrl, {
      withCredentials: true
    });
  }
}