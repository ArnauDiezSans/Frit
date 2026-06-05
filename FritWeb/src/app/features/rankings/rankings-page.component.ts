import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import {
  RankingJuego,
  RankingPeriodo,
  RankingUsuario,
  RankingVictoriaJuego,
  Rankings,
  RankingsService
} from './rankings.service';

@Component({
  selector: 'app-rankings-page',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './rankings-page.component.html',
  styleUrl: './rankings-page.component.css'
})
export class RankingsPageComponent {
  private authService = inject(AuthService);
  private rankingsService = inject(RankingsService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  rankings = signal<Rankings | null>(null);

  ngOnInit(): void {
    this.cargarRankings();
  }

  cargarRankings(): void {
    this.loading.set(true);
    this.error.set('');

    this.rankingsService.get().subscribe({
      next: rankings => {
        this.rankings.set(rankings);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar els rankings.");
        this.loading.set(false);
      }
    });
  }

  formatMinutes(value: number | null | undefined): string {
    return value || value === 0 ? `${value} min` : '-';
  }

  formatHours(value: number | null | undefined): string {
    return value || value === 0 ? `${value} h` : '-';
  }

  formatMoney(value: number | null | undefined): string {
    return value || value === 0
      ? value.toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' })
      : '-';
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleDateString('ca-ES') : 'Mai';
  }

  formatPercent(value: number | null | undefined): string {
    return value || value === 0 ? `${value}%` : '-';
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByJuegoId(_: number, item: RankingJuego): number {
    return item.juegoId;
  }

  trackByUsuarioId(_: number, item: RankingUsuario): number {
    return item.usuarioId;
  }

  trackByVictoria(_: number, item: RankingVictoriaJuego): string {
    return `${item.juegoId}-${item.usuarioId}`;
  }

  trackByPeriodo(_: number, item: RankingPeriodo): string {
    return `${item.periodo}-${item.usuarioId}`;
  }
}
