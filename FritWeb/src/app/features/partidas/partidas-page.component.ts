import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PartidasService } from './partidas.service';
import { Partida } from './partidas.models';

@Component({
  selector: 'app-partidas-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partidas-page.component.html',
  styleUrl: './partidas-page.component.css'
})
export class PartidasPageComponent implements OnInit {
  private authService = inject(AuthService);
  private partidasService = inject(PartidasService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  partidas = signal<Partida[]>([]);

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuario');

  totalPartidas = computed(() => this.partidas().length);

  partidasEsteMes = computed(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return this.partidas().filter(partida => {
      const fecha = new Date(partida.fecha);
      return fecha.getMonth() === month && fecha.getFullYear() === year;
    }).length;
  });

  duracionMedia = computed(() => {
    const conDuracion = this.partidas().filter(p => !!p.duracionMinutos);

    if (conDuracion.length === 0) {
      return null;
    }

    const total = conDuracion.reduce((sum, p) => sum + (p.duracionMinutos ?? 0), 0);
    return Math.round(total / conDuracion.length);
  });

  ultimasPartidas = computed(() => this.partidas().slice(0, 6));

  ngOnInit(): void {
    this.cargarPartidas();
  }

  cargarPartidas(): void {
    this.loading.set(true);
    this.error.set('');

    this.partidasService.getAll().subscribe({
      next: partidas => {
        this.partidas.set(partidas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las partidas.');
        this.loading.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.router.navigateByUrl('/login');
      }
    });
  }

  formatFecha(value: string): string {
    return new Date(value).toLocaleDateString('es-ES');
  }

  trackByPartidaId(_: number, partida: Partida): number {
    return partida.partidaId;
  }
}