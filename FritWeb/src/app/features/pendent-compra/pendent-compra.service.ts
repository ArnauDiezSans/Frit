import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

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
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/pendent-compra`;
  private cacheKey = 'pendent-compra';

  getAll(): Observable<PendentCompraItem[]> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<PendentCompraItem[]>(this.baseUrl, {
        withCredentials: true
      })
    );
  }

  create(data: PendentCompraWrite): Observable<PendentCompraItem> {
    return this.http.post<PendentCompraItem>(this.baseUrl, data, {
      withCredentials: true
    }).pipe(
      tap(item => {
        this.dataStore.update<PendentCompraItem[]>(this.cacheKey, current => [item, ...(current ?? [])]);
      })
    );
  }

  update(id: number, data: PendentCompraWrite): Observable<PendentCompraItem> {
    return this.http.put<PendentCompraItem>(`${this.baseUrl}/${id}`, data, {
      withCredentials: true
    }).pipe(
      tap(updated => {
        this.dataStore.update<PendentCompraItem[]>(this.cacheKey, current =>
          (current ?? []).map(item => item.pendentCompraId === id ? updated : item)
        );
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.update<PendentCompraItem[]>(this.cacheKey, current =>
          (current ?? []).filter(item => item.pendentCompraId !== id)
        );
      })
    );
  }

  deleteSelected(ids: number[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/delete-selected`, { ids }, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.update<PendentCompraItem[]>(this.cacheKey, current =>
          (current ?? []).filter(item => !ids.includes(item.pendentCompraId))
        );
      })
    );
  }
}
