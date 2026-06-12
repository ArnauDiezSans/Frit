import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';

export interface MedalProgress {
  medalId: string;
  nombre: string;
  descripcion: string;
  iconPath: string;
  tipo: string;
  currentValue: number;
  targetValue: number;
  rankName: string;
  rankLevel: number;
  rankColor: string;
  rankFilled: boolean;
  nextRankName?: string | null;
  nextTargetValue?: number | null;
  completed: boolean;
  epicScore: number;
}

export interface MedalUserProgress {
  usuarioId: number;
  usuarioNombre: string;
  currentValue: number;
  rankName: string;
  rankLevel: number;
}

export interface HallOfFameEntry {
  medal: MedalProgress;
  bestUser: MedalUserProgress;
}

export interface HallOfFame {
  canManageManualMedals: boolean;
  entries: HallOfFameEntry[];
}

export interface UserMedals {
  usuarioId: number;
  usuarioNombre: string;
  medals: MedalProgress[];
}

export interface ManualMedallaCreate {
  nombre: string;
  descripcion: string;
  iconPath?: string | null;
  usuarioIds: number[];
}

@Injectable({ providedIn: 'root' })
export class HallOfFameService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/hall-of-fame`;

  getHallOfFame(): Observable<HallOfFame> {
    return this.dataStore.get('hall-of-fame', () =>
      this.http.get<HallOfFame>(this.baseUrl, {
        withCredentials: true
      })
    );
  }

  getUserMedals(usuarioId: number): Observable<UserMedals> {
    return this.dataStore.get(`hall-of-fame:user:${usuarioId}`, () =>
      this.http.get<UserMedals>(`${this.baseUrl}/usuarios/${usuarioId}`, {
        withCredentials: true
      })
    );
  }

  createManualMedal(data: ManualMedallaCreate): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/manual-medallas`, data, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.invalidate('hall-of-fame');
        this.dataStore.invalidateByPrefix('hall-of-fame:user:');
      })
    );
  }
}
