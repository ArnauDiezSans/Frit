import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom, take } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';

export interface PushNotificationStatus {
  supported: boolean;
  configured: boolean;
  subscribed: boolean;
  permission: NotificationPermission;
  needsIosInstallation: boolean;
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
      this.http.get<PushConfiguration>(`${this.baseUrl}/configuracion`, { withCredentials: true })
    );
    const subscription = this.swPush.isEnabled
      ? await firstValueFrom(this.swPush.subscription.pipe(take(1)))
      : null;

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
      this.http.get<PushConfiguration>(`${this.baseUrl}/configuracion`, { withCredentials: true })
    );
    this.configuration = configuration;
    if (!this.swPush.isEnabled) {
      throw new Error('Aquest navegador no admet notificacions push.');
    }
    if (!configuration.configured || !configuration.publicKey) {
      throw new Error('Les notificacions encara no estan configurades al servidor.');
    }

    const subscription = await this.swPush.requestSubscription({ serverPublicKey: configuration.publicKey });
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/suscripciones`, subscription.toJSON(), { withCredentials: true })
    );
  }

  async unsubscribe(): Promise<void> {
    const subscription = await firstValueFrom(this.swPush.subscription.pipe(take(1)));
    if (!subscription) return;
    await firstValueFrom(this.http.request<void>('DELETE', `${this.baseUrl}/suscripciones`, {
      body: { endpoint: subscription.endpoint },
      withCredentials: true
    }));
    await this.swPush.unsubscribe();
  }

  async sendTest(): Promise<void> {
    const subscription = await firstValueFrom(this.swPush.subscription.pipe(take(1)));
    if (!subscription) throw new Error("Activa les notificacions abans d'enviar una prova.");
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/prueba`, { endpoint: subscription.endpoint }, { withCredentials: true })
    );
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  private isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
  }
}
