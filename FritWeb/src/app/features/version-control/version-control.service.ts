import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';

export interface VersionCommit {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
}

export interface VersionControl {
  repositoryRoot: string;
  branch: string;
  commits: VersionCommit[];
}

@Injectable({ providedIn: 'root' })
export class VersionControlService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/version-control`;

  get(): Observable<VersionControl> {
    return this.http.get<VersionControl>(this.baseUrl, {
      withCredentials: true
    });
  }
}
