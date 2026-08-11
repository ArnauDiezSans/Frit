import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { catchError, firstValueFrom, of, take, timeout } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';

export interface PushNotificationStatus {
  supported: boolean;
  configured: boolean;
  subscribed: boolean;
  permission: NotificationPermission;
  needsIosInstallation: boolean;
}

export interface NotificationPreferences {
  nuevaPartida: boolean;
  nuevaRemada: boolean;
  encuesta: boolean;
  cambioPreferenciaJuego: boolean;
  puntuacionMinima: number;
  recordatorioDomingo: boolean;
}

interface PushConfiguration {
  configured: boolean;
  publicKey: string | null;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private http = inject(HttpClient);
  private swPush = inject(SwPush);
  private baseUrl = `${API_BASE_URL}/notificaciones`;
  private configuration: PushConfiguration | null = null;

  async getStatus(): Promise<PushNotificationStatus> {
    this.configuration = await firstValueFrom(
      this.http.get<PushConfiguration>(`${this.baseUrl}/configuracion`, { withCredentials: true }).pipe(
        timeout(8000),
        catchError(() => of({ configured: false, publicKey: null }))
      )
    );
    const subscription = await this.getCurrentSubscription();

    return {
      supported: this.swPush.isEnabled,
      configured: this.configuration.configured,
      subscribed: subscription !== null,
      permission: typeof Notification === 'undefined' ? 'default' : Notification.permission,
      needsIosInstallation: this.isIos() && !this.isStandalone()
    };
  }

  async subscribe(): Promise<void> {
    const configuration = this.configuration ?? await firstValueFrom(
      this.http.get<PushConfiguration>(`${this.baseUrl}/configuracion`, { withCredentials: true }).pipe(timeout(8000))
    );
    this.configuration = configuration;
    if (!this.swPush.isEnabled) {
      throw new Error('Aquest navegador no admet notificacions push.');
    }
    if (!configuration.configured || !configuration.publicKey) {
      throw new Error('Les notificacions encara no estan configurades al servidor.');
    }

    const subscription = await this.withTimeout(
      this.swPush.requestSubscription({ serverPublicKey: configuration.publicKey }),
      15000,
      "El navegador no ha pogut activar les notificacions. Torna-ho a provar o revisa els permisos."
    );
    await this.withTimeout(
      firstValueFrom(this.http.post<void>(`${this.baseUrl}/suscripciones`, subscription.toJSON(), { withCredentials: true })),
      10000,
      "El servidor no ha pogut desar l'activació de les notificacions."
    );
  }

  async getPreferences(): Promise<NotificationPreferences> {
    return await firstValueFrom(
      this.http.get<NotificationPreferences>(`${this.baseUrl}/preferencias`, { withCredentials: true })
    );
  }

  async updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    return await firstValueFrom(
      this.http.put<NotificationPreferences>(`${this.baseUrl}/preferencias`, preferences, { withCredentials: true })
    );
  }

  async unsubscribe(): Promise<void> {
    const subscription = await this.getCurrentSubscription();
    if (!subscription) return;
    await this.withTimeout(
      firstValueFrom(this.http.request<void>('DELETE', `${this.baseUrl}/suscripciones`, {
        body: { endpoint: subscription.endpoint },
        withCredentials: true
      })),
      10000,
      "El servidor no ha pogut desar la desactivació de les notificacions."
    );
    await this.withTimeout(
      this.swPush.unsubscribe(),
      10000,
      "El navegador no ha pogut desactivar les notificacions. Torna-ho a provar."
    );
  }

  async sendTest(): Promise<void> {
    const subscription = await this.getCurrentSubscription();
    if (!subscription) throw new Error("Activa les notificacions abans d'enviar una prova.");
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/prueba`, { endpoint: subscription.endpoint }, { withCredentials: true })
    );
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  private async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.swPush.isEnabled) return null;
    return await firstValueFrom(this.swPush.subscription.pipe(
      take(1),
      timeout(5000),
      catchError(() => of(null))
    ));
  }

  private async withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  private isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
  }
}
