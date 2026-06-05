import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL  } from '../../core/api/api.config';
import { DataStoreService } from '../../core/data/data-store.service';
import { UsuarioOption } from './juegos.models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private baseUrl = `${API_BASE_URL}/usuarios`;
  private cacheKey = 'usuarios';

  getAll(): Observable<UsuarioOption[]> {
    return this.dataStore.get(this.cacheKey, () =>
      this.http.get<UsuarioOption[]>(this.baseUrl, {
        withCredentials: true
      })
    );
  }
}
