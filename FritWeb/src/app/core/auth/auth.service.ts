import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AuthUser, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/auth`;

  currentUser: AuthUser | null = null;
  initialized = false;

  login(data: LoginRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.baseUrl}/login`, data, {
      withCredentials: true
    }).pipe(
      tap(user => {
        this.currentUser = user;
        this.initialized = true;
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.baseUrl}/register`, data, {
      withCredentials: true
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.currentUser = null;
        this.initialized = true;
      })
    );
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/me`, {
      withCredentials: true
    }).pipe(
      tap(user => {
        this.currentUser = user;
        this.initialized = true;
      })
    );
  }

  initializeAuth(): Observable<boolean> {
    return this.me().pipe(
      map(() => true),
      catchError(() => {
        this.currentUser = null;
        this.initialized = true;
        return of(true);
      })
    );
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}