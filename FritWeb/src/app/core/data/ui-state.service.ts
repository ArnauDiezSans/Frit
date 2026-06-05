import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  get<T>(key: string, fallback: T): T {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  clearByPrefix(prefix: string): void {
    Object.keys(window.localStorage)
      .filter(key => key.startsWith(prefix))
      .forEach(key => window.localStorage.removeItem(key));
  }
}
