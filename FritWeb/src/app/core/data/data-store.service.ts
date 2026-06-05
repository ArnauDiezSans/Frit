import { Injectable } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private values = new Map<string, unknown>();
  private requests = new Map<string, Observable<unknown>>();

  get<T>(key: string, factory: () => Observable<T>): Observable<T> {
    if (this.values.has(key)) {
      return of(this.values.get(key) as T);
    }

    if (this.requests.has(key)) {
      return this.requests.get(key) as Observable<T>;
    }

    const request$ = factory().pipe(
      tap(value => this.values.set(key, value)),
      finalize(() => this.requests.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.requests.set(key, request$);
    return request$;
  }

  set<T>(key: string, value: T): void {
    this.values.set(key, value);
    this.requests.delete(key);
  }

  update<T>(key: string, updater: (current: T | undefined) => T): void {
    this.set(key, updater(this.values.get(key) as T | undefined));
  }

  invalidate(key: string): void {
    this.values.delete(key);
    this.requests.delete(key);
  }

  invalidateMany(keys: string[]): void {
    keys.forEach(key => this.invalidate(key));
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of [...this.values.keys(), ...this.requests.keys()]) {
      if (key.startsWith(prefix)) {
        this.invalidate(key);
      }
    }
  }

  clear(): void {
    this.values.clear();
    this.requests.clear();
  }
}
