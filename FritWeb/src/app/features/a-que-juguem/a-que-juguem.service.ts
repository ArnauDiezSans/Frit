import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface AQueJuguemRecommendation {
  juegoId: number;
  nombre: string;
  numeroJugadoresMin: number;
  numeroJugadoresMax: number;
  puntuacion: number;
}

@Injectable({ providedIn: 'root' })
export class AQueJuguemService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/a-que-juguem`;

  getRecommendations(
    numeroJugadores: number,
    usuarioIds: number[]
  ): Observable<AQueJuguemRecommendation[]> {
    return this.http.post<AQueJuguemRecommendation[]>(
      `${this.baseUrl}/recommendations`,
      { numeroJugadores, usuarioIds },
      { withCredentials: true }
    );
  }
}
