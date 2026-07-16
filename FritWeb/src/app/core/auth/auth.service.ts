import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { DataStoreService } from '../data/data-store.service';
import { UiStateService } from '../data/ui-state.service';
import { AuthUser, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private dataStore = inject(DataStoreService);
  private uiState = inject(UiStateService);
  private baseUrl = `${API_BASE_URL}/auth`;

  private readonly currentUserState = signal<AuthUser | null>(null);
  readonly currentUserSignal = this.currentUserState.asReadonly();
  readonly isAdmin = computed(() => this.currentUserState()?.esAdmin === true);
  initialized = false;

  get currentUser(): AuthUser | null {
    return this.currentUserState();
  }

  set currentUser(user: AuthUser | null) {
    this.currentUserState.set(user);
  }

  login(data: LoginRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.baseUrl}/login`, data, {
      withCredentials: true
    }).pipe(
      tap(user => {
        this.dataStore.clear();
        this.uiState.clearByPrefix('ui:');
        this.currentUser = user;
        this.initialized = true;
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.baseUrl}/register`, data, {
      withCredentials: true
    }).pipe(
      tap(user => {
        this.dataStore.clear();
        this.uiState.clearByPrefix('ui:');
        this.currentUser = user;
        this.initialized = true;
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.dataStore.clear();
        this.uiState.clearByPrefix('ui:');
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

  canViewHallOfFame(): boolean {
    return this.isAuthenticated();
  }
}
