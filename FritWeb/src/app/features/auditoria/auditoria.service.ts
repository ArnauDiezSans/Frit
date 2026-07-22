import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface AuditEntry {
  auditEntryId: number;
  usuarioId: number;
  usuarioNombre: string;
  ip?: string | null;
  entidad: string;
  registroId: string;
  accion: string;
  valoresAnteriors?: string | null;
  valorsNous?: string | null;
  createdAt: string;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFilters {
  usuario?: string;
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
  texto?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/auditoria`;

  get(page: number, pageSize: number, filters: AuditFilters): Observable<AuditPage> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
      }
    });

    return this.http.get<AuditPage>(this.baseUrl, { params, withCredentials: true });
  }
}
