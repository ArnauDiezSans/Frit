import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Juego } from '../juegos/juegos.models';
import { JuegosService } from '../juegos/juegos.service';
import {
  Partida,
  PartidaGridRow,
  PartidaJugador
} from './partidas.models';
import { PartidasService } from './partidas.service';
import { PartidaJugadoresService } from './partida-jugadores.service';

type SortColumn =
  | 'fecha'
  | 'juegoNombre'
  | 'duracionMinutos'
  | 'numeroJugadores'
  | 'resultadoJugadores'
  | 'observaciones';

type SortDirection = 'asc' | 'desc';

interface PartidasFilters {
  fecha: string;
  juegoNombre: string;
  duracionMinutos: string;
  numeroJugadores: string;
  resultadoJugadores: string;
  observaciones: string;
}

const EMPTY_FILTERS: PartidasFilters = {
  fecha: '',
  juegoNombre: '',
  duracionMinutos: '',
  numeroJugadores: '',
  resultadoJugadores: '',
  observaciones: ''
};

@Component({
  selector: 'app-partidas-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './partidas-page.component.html',
  styleUrl: './partidas-page.component.css'
})
export class PartidasPageComponent implements OnInit {
  private authService = inject(AuthService);
  private partidasService = inject(PartidasService);
  private juegosService = inject(JuegosService);
  private partidaJugadoresService = inject(PartidaJugadoresService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');

  partidas = signal<Partida[]>([]);
  juegos = signal<Juego[]>([]);
  partidaJugadores = signal<PartidaJugador[]>([]);

  filters = signal<PartidasFilters>({ ...EMPTY_FILTERS });
  sortColumn = signal<SortColumn>('fecha');
  sortDirection = signal<SortDirection>('desc');

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuari');

  partidasGrid = computed<PartidaGridRow[]>(() => {
    const partidas = this.partidas();
    const juegos = this.juegos();
    const partidaJugadores = this.partidaJugadores();

    return partidas.map(partida => {
      const juego = juegos.find(item => item.juegoId === partida.juegoId);
      const jugadoresPartida = partidaJugadores
        .filter(jugador => jugador.partidaId === partida.partidaId)
        .sort((a, b) => a.posicion - b.posicion);

      const resultadoJugadores = jugadoresPartida.length
        ? jugadoresPartida
            .map(jugador =>
              jugador.puntos !== null && jugador.puntos !== undefined
                ? `${jugador.nombreMostrado}: ${this.formatPuntos(jugador.puntos)}`
                : `${jugador.nombreMostrado}: -`
            )
            .join(' · ')
        : '-';

      return {
        partidaId: partida.partidaId,
        juegoId: partida.juegoId,
        juegoNombre: juego?.nombre ?? `Joc #${partida.juegoId}`,
        fecha: partida.fecha,
        duracionMinutos: partida.duracionMinutos ?? null,
        numeroJugadores: partida.numeroJugadores,
        resultadoJugadores,
        observaciones: partida.observaciones?.trim() ?? ''
      };
    });
  });

  totalPartidas = computed(() => this.partidasGrid().length);

  partidasEsteMes = computed(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return this.partidasGrid().filter(partida => {
      const fecha = new Date(partida.fecha);
      return fecha.getMonth() === month && fecha.getFullYear() === year;
    }).length;
  });

  duracionMedia = computed(() => {
    const conDuracion = this.partidasGrid().filter(
      partida => partida.duracionMinutos !== null && partida.duracionMinutos > 0
    );

    if (conDuracion.length === 0) {
      return null;
    }

    const total = conDuracion.reduce(
      (sum, partida) => sum + (partida.duracionMinutos ?? 0),
      0
    );

    return Math.round(total / conDuracion.length);
  });

  partidasFiltradasOrdenadas = computed(() => {
    const filters = this.filters();
    const sortColumn = this.sortColumn();
    const sortDirection = this.sortDirection();
    const rows = [...this.partidasGrid()];

    const filtered = rows.filter(row => {
      if (
        filters.fecha.trim() &&
        !this.formatFecha(row.fecha)
          .toLowerCase()
          .includes(filters.fecha.trim().toLowerCase())
      ) {
        return false;
      }

      if (
        filters.juegoNombre.trim() &&
        !row.juegoNombre.toLowerCase().includes(filters.juegoNombre.trim().toLowerCase())
      ) {
        return false;
      }

      if (filters.duracionMinutos.trim()) {
        const value = Number(filters.duracionMinutos);

        if (Number.isFinite(value)) {
          if ((row.duracionMinutos ?? 0) !== value) {
            return false;
          }
        } else if (
          !(
            row.duracionMinutos !== null &&
            String(row.duracionMinutos)
              .toLowerCase()
              .includes(filters.duracionMinutos.trim().toLowerCase())
          )
        ) {
          return false;
        }
      }

      if (filters.numeroJugadores.trim()) {
        const value = Number(filters.numeroJugadores);

        if (Number.isFinite(value)) {
          if (row.numeroJugadores !== value) {
            return false;
          }
        } else if (
          !String(row.numeroJugadores)
            .toLowerCase()
            .includes(filters.numeroJugadores.trim().toLowerCase())
        ) {
          return false;
        }
      }

      if (
        filters.resultadoJugadores.trim() &&
        !row.resultadoJugadores
          .toLowerCase()
          .includes(filters.resultadoJugadores.trim().toLowerCase())
      ) {
        return false;
      }

      if (
        filters.observaciones.trim() &&
        !(row.observaciones || '-')
          .toLowerCase()
          .includes(filters.observaciones.trim().toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'fecha':
          return (
            (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) * direction
          );

        case 'juegoNombre':
          return a.juegoNombre.localeCompare(b.juegoNombre, 'ca') * direction;

        case 'duracionMinutos':
          return ((a.duracionMinutos ?? -1) - (b.duracionMinutos ?? -1)) * direction;

        case 'numeroJugadores':
          return (a.numeroJugadores - b.numeroJugadores) * direction;

        case 'resultadoJugadores':
          return (
            a.resultadoJugadores.localeCompare(b.resultadoJugadores, 'ca') * direction
          );

        case 'observaciones':
          return (
            (a.observaciones || '-').localeCompare(b.observaciones || '-', 'ca') *
            direction
          );

        default:
          return 0;
      }
    });

    return filtered;
  });

  ngOnInit(): void {
    this.cargarPartidas();
  }

  cargarPartidas(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      partidas: this.partidasService.getAll(),
      juegos: this.juegosService.getAll(),
      partidaJugadores: this.partidaJugadoresService.getAll()
    }).subscribe({
      next: (result) => {
        this.partidas.set(result.partidas);
        this.juegos.set(result.juegos);
        this.partidaJugadores.set(result.partidaJugadores);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar les partides.");
        this.loading.set(false);
      }
    });
  }

  updateFilter(field: keyof PartidasFilters, value: string): void {
    this.filters.update(current => ({
      ...current,
      [field]: value
    }));
  }

  clearAllFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  setSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortColumn.set(column);
    this.sortDirection.set(column === 'fecha' ? 'desc' : 'asc');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  formatFecha(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  trackByPartidaId(_: number, partida: PartidaGridRow): number {
    return partida.partidaId;
  }

  private formatPuntos(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
}