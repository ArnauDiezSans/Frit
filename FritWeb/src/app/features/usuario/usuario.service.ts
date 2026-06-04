import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface UsuarioDetalle {
  usuarioId: number;
  nombre: string;
  grupo?: string | null;
  observaciones?: string | null;
  createdAt: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/usuarios`;

  getById(id: number): Observable<UsuarioDetalle> {
    return this.http.get<UsuarioDetalle>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    });
  }

  changePassword(id: number, data: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/password`, data, {
      withCredentials: true
    });
  }
}
