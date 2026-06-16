import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

export const CSOPA_TIPUS_SOPAR = 1;
export const CSOPA_TIPUS_GYMFRIT = 2;

export interface CsopaAssistencia {
  csopaAssistenciaId: number;
  usuarioId: number;
  usuarioNombre: string;
  createdAt: string;
}

export interface CsopaActivitat {
  csopaActivitatId: number;
  titol: string;
  tipus: number;
  usuarioCreadorId: number;
  usuarioCreadorNombre: string;
  createdAt: string;
  yaAsistidaPorUsuario: boolean;
  assistencies: CsopaAssistencia[];
}

export interface CsopaActivitatCreate {
  titol?: string | null;
  tipus: number;
  fecha: string;
}

export interface CsopaAssistenciaCreate {
  usuarioId: number;
}

@Injectable({ providedIn: 'root' })
export class CsopaService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/csopa`;
  private cacheKey = 'csopa';

  getAll(): Observable<CsopaActivitat[]> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<CsopaActivitat[]>(this.baseUrl, {
        withCredentials: true
      })
    );
  }

  create(data: CsopaActivitatCreate): Observable<CsopaActivitat> {
    return this.http.post<CsopaActivitat>(this.baseUrl, data, {
      withCredentials: true
    }).pipe(
      tap(activitat => {
        this.dataStore.update<CsopaActivitat[]>(this.cacheKey, current => [activitat, ...(current ?? [])]);
        this.invalidateHallOfFame();
      })
    );
  }

  marcarAssistencia(activitatId: number, data: CsopaAssistenciaCreate): Observable<CsopaActivitat> {
    return this.http.post<CsopaActivitat>(`${this.baseUrl}/${activitatId}/assistencies`, data, {
      withCredentials: true
    }).pipe(
      tap(updated => {
        this.dataStore.update<CsopaActivitat[]>(this.cacheKey, current =>
          (current ?? []).map(activitat => activitat.csopaActivitatId === activitatId ? updated : activitat)
        );
        this.invalidateHallOfFame();
      })
    );
  }

  private invalidateHallOfFame(): void {
    this.dataStore.invalidate('hall-of-fame');
    this.dataStore.invalidateByPrefix('hall-of-fame:user:');
  }
}
