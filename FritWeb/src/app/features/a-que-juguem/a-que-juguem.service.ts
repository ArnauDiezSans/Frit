import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

export interface AQueJuguemRecommendation {
  juegoId: number;
  nombre: string;
  numeroJugadoresMin: number;
  numeroJugadoresMax: number;
  puntuacion: number;
  puntuacionesUsuarios?: AQueJuguemPuntuacionUsuario[];
  tempsMigMinuts?: number | null;
  tempsMigFallback?: boolean;
}

export interface AQueJuguemPuntuacionUsuario {
  usuarioId: number;
  usuarioNombre: string;
  puntuacion: number;
}

@Injectable({ providedIn: 'root' })
export class AQueJuguemService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/a-que-juguem`;

  getRecommendations(
    numeroJugadores: number,
    usuarioIds: number[]
  ): Observable<AQueJuguemRecommendation[]> {
    const sortedUsuarioIds = [...usuarioIds].sort((a, b) => a - b);
    const cacheKey = `a-que-juguem:${numeroJugadores}:${sortedUsuarioIds.join(',')}`;

    return this.dataStore.get(cacheKey, () =>
      this.http.post<AQueJuguemRecommendation[]>(
        `${this.baseUrl}/recommendations`,
        { numeroJugadores, usuarioIds },
        { withCredentials: true }
      )
    );
  }
}
