import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

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

export interface UsuarioJuegoOrden {
  juegoId: number;
  nombre: string;
  posicion: number;
}

export interface UsuarioJuegoOrdenUpdate {
  juegos: Array<{
    juegoId: number;
    posicion: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/usuarios`;

  getById(id: number): Observable<UsuarioDetalle> {
    return this.dataStore.get(`usuario:${id}`, () =>
      this.http.get<UsuarioDetalle>(`${this.baseUrl}/${id}`, {
        withCredentials: true
      })
    );
  }

  changePassword(id: number, data: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/password`, data, {
      withCredentials: true
    });
  }

  getJuegosOrden(id: number): Observable<UsuarioJuegoOrden[]> {
    return this.dataStore.get(`usuario-juegos-orden:${id}`, () =>
      this.http.get<UsuarioJuegoOrden[]>(`${this.baseUrl}/${id}/juegos-orden`, {
        withCredentials: true
      })
    );
  }

  updateJuegosOrden(id: number, data: UsuarioJuegoOrdenUpdate): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/juegos-orden`, data, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.invalidate(`usuario-juegos-orden:${id}`);
        this.dataStore.invalidateByPrefix('a-que-juguem:');
      })
    );
  }
}
