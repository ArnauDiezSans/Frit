import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface LaLlistaItem {
  juegoId: number;
  nombre: string;
  ultimaPartida?: string | null;
  estadoCaducidad: 'red' | 'yellow' | 'expired' | '';
}

@Injectable({ providedIn: 'root' })
export class LaLlistaService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/la-llista`;

  getAll(): Observable<LaLlistaItem[]> {
    return this.http.get<LaLlistaItem[]>(this.baseUrl, {
      withCredentials: true
    });
  }
}
