import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface PendentCompraItem {
  pendentCompraId: number;
  usuarioId: number;
  usuarioNombre: string;
  quantitat: number;
  descripcio: string;
  link?: string | null;
  createdAt: string;
}

export interface PendentCompraWrite {
  quantitat: number;
  descripcio: string;
  link?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PendentCompraService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/pendent-compra`;

  getAll(): Observable<PendentCompraItem[]> {
    return this.http.get<PendentCompraItem[]>(this.baseUrl, {
      withCredentials: true
    });
  }

  create(data: PendentCompraWrite): Observable<PendentCompraItem> {
    return this.http.post<PendentCompraItem>(this.baseUrl, data, {
      withCredentials: true
    });
  }

  deleteSelected(ids: number[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/delete-selected`, { ids }, {
      withCredentials: true
    });
  }
}
