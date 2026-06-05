import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import {
  RankingJugador,
  RankingPartida,
  Rankings,
  RankingsService
} from './rankings.service';

type GameSortColumn = 'nombre' | 'partidas' | 'horas' | 'mitjana' | 'ultima';
type UserSortColumn = 'usuario' | 'joc' | 'partidas' | 'victorias' | 'porcentaje' | 'ultima';
type GameDetailSortColumn = 'usuario' | 'partidas' | 'victorias' | 'porcentaje';
type SortDirection = 'asc' | 'desc';

interface GameRankingRow {
  juegoId: number;
  nombre: string;
  numeroPartidas: number;
  duracionTotalMinutos: number;
  duracionMediaMinutos: number | null;
  ultimaPartida: string | null;
}

interface UserRankingRow {
  usuarioId: number;
  usuarioNombre: string;
  partidasTotales: number;
  victorias: number;
  porcentajeVictoria: number;
}

interface UserGameRankingRow {
  juegoId: number;
  juegoNombre: string;
  partidasTotales: number;
  victorias: number;
  porcentajeVictoria: number;
  ultimaPartida: string | null;
}

interface GameFilters {
  juegoId: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface UserFilters {
  usuarioId: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface GameColumns {
  nombre: boolean;
  partidas: boolean;
  horas: boolean;
  mitjana: boolean;
  ultima: boolean;
}

interface DetailColumns {
  usuario: boolean;
  partidas: boolean;
  victorias: boolean;
  porcentaje: boolean;
}

interface UserColumns {
  usuario: boolean;
  joc: boolean;
  partidas: boolean;
  victorias: boolean;
  porcentaje: boolean;
  ultima: boolean;
}

const EMPTY_GAME_FILTERS: GameFilters = {
  juegoId: '',
  fechaDesde: '',
  fechaHasta: ''
};

const EMPTY_USER_FILTERS: UserFilters = {
  usuarioId: '',
  fechaDesde: '',
  fechaHasta: ''
};

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

  gameFilters = signal<GameFilters>({ ...EMPTY_GAME_FILTERS });
  userFilters = signal<UserFilters>({ ...EMPTY_USER_FILTERS });

  gameColumns = signal<GameColumns>({
    nombre: true,
    partidas: true,
    horas: true,
    mitjana: true,
    ultima: true
  });

  detailColumns = signal<DetailColumns>({
    usuario: true,
    partidas: true,
    victorias: true,
    porcentaje: true
  });

  userColumns = signal<UserColumns>({
    usuario: true,
    joc: true,
    partidas: true,
    victorias: true,
    porcentaje: true,
    ultima: true
  });

  showGameFilters = signal(false);
  showUserFilters = signal(false);
  showGameColumnsPanel = signal(false);
  showUserColumnsPanel = signal(false);
  isMobileFilters = signal(false);

  gameSortColumn = signal<GameSortColumn | null>('partidas');
  gameSortDirection = signal<SortDirection | null>('desc');
  gameDetailSortColumn = signal<GameDetailSortColumn | null>('victorias');
  gameDetailSortDirection = signal<SortDirection | null>('desc');
  userSortColumn = signal<UserSortColumn | null>('victorias');
  userSortDirection = signal<SortDirection | null>('desc');

  gameOptions = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    return [...data.juegos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  userOptions = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const users = new Map<number, string>();
    for (const jugador of data.jugadores) {
      users.set(jugador.usuarioId, jugador.usuarioNombre);
    }

    return Array.from(users.entries())
      .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  selectedGameName = computed(() => {
    const juegoId = Number(this.gameFilters().juegoId);
    return this.gameOptions().find(juego => juego.juegoId === juegoId)?.nombre ?? '';
  });

  selectedUserName = computed(() => {
    const usuarioId = Number(this.userFilters().usuarioId);
    return this.userOptions().find(usuario => usuario.usuarioId === usuarioId)?.nombre ?? '';
  });

  gameRows = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const rows = this.buildGameRows(data.partidas, this.gameFilters());
    return this.sortGameRows(rows);
  });

  selectedGameRows = computed(() => {
    const data = this.rankings();
    const juegoId = Number(this.gameFilters().juegoId);
    if (!data || !juegoId) {
      return [];
    }

    const rows = this.buildUserRows(
      data.jugadores.filter(jugador => jugador.juegoId === juegoId),
      {
        juegoId: String(juegoId),
        fechaDesde: this.gameFilters().fechaDesde,
        fechaHasta: this.gameFilters().fechaHasta
      }
    );

    return this.sortDetailRows(rows, this.gameDetailSortColumn(), this.gameDetailSortDirection());
  });

  userRows = computed(() => {
    const data = this.rankings();
    if (!data || this.userFilters().usuarioId) {
      return [];
    }

    const rows = this.buildUserRows(data.jugadores, this.userFilters());
    return this.sortDetailRows(rows, this.userSortColumn(), this.userSortDirection());
  });

  selectedUserGameRows = computed(() => {
    const data = this.rankings();
    const usuarioId = Number(this.userFilters().usuarioId);
    if (!data || !usuarioId) {
      return [];
    }

    const rows = this.buildUserGameRows(data.jugadores, this.userFilters());
    return this.sortUserGameRows(rows);
  });

  allGameColumnsSelected = computed(() => Object.values(this.gameColumns()).every(Boolean));
  allDetailColumnsSelected = computed(() => Object.values(this.detailColumns()).every(Boolean));
  allUserColumnsSelected = computed(() => Object.values(this.userColumns()).every(Boolean));

  constructor() {
    this.updateResponsiveState();
  }

  ngOnInit(): void {
    this.cargarRankings();
  }

  @HostListener('window:click')
  onWindowClick(): void {
    this.showGameColumnsPanel.set(false);
    this.showUserColumnsPanel.set(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateResponsiveState();
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

  updateGameFilter<K extends keyof GameFilters>(key: K, value: string): void {
    this.gameFilters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  updateUserFilter<K extends keyof UserFilters>(key: K, value: string): void {
    this.userFilters.update(current => ({
      ...current,
      [key]: value
    }));

    if (key === 'usuarioId') {
      this.userSortColumn.set(value ? 'partidas' : 'victorias');
      this.userSortDirection.set('desc');
    }
  }

  clearGameFilters(): void {
    this.gameFilters.set({ ...EMPTY_GAME_FILTERS });
  }

  clearUserFilters(): void {
    this.userFilters.set({ ...EMPTY_USER_FILTERS });
  }

  toggleGameFilters(): void {
    this.showGameFilters.update(value => {
      if (value) {
        this.clearGameFilters();
      }

      return !value;
    });
  }

  toggleUserFilters(): void {
    this.showUserFilters.update(value => {
      if (value) {
        this.clearUserFilters();
      }

      return !value;
    });
  }

  toggleGameColumnsPanel(event: Event): void {
    event.stopPropagation();
    this.showGameColumnsPanel.update(value => !value);
  }

  toggleUserColumnsPanel(event: Event): void {
    event.stopPropagation();
    this.showUserColumnsPanel.update(value => !value);
  }

  toggleGameColumn(column: keyof GameColumns): void {
    this.gameColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  toggleDetailColumn(column: keyof DetailColumns): void {
    this.detailColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  toggleUserColumn(column: keyof UserColumns): void {
    this.userColumns.update(current => ({
      ...current,
      [column]: !current[column]
    }));
  }

  selectAllGameColumns(): void {
    const nextValue = !this.allGameColumnsSelected();
    this.gameColumns.set({
      nombre: nextValue,
      partidas: nextValue,
      horas: nextValue,
      mitjana: nextValue,
      ultima: nextValue
    });
  }

  selectAllDetailColumns(): void {
    const nextValue = !this.allDetailColumnsSelected();
    this.detailColumns.set({
      usuario: nextValue,
      partidas: nextValue,
      victorias: nextValue,
      porcentaje: nextValue
    });
  }

  selectAllUserColumns(): void {
    const nextValue = !this.allUserColumnsSelected();
    this.userColumns.set({
      usuario: nextValue,
      joc: nextValue,
      partidas: nextValue,
      victorias: nextValue,
      porcentaje: nextValue,
      ultima: nextValue
    });
  }

  sortGamesBy(column: GameSortColumn): void {
    const currentColumn = this.gameSortColumn();
    const currentDirection = this.gameSortDirection();

    if (currentColumn !== column) {
      this.gameSortColumn.set(column);
      this.gameSortDirection.set(column === 'nombre' ? 'asc' : 'desc');
      return;
    }

    if (currentDirection === 'asc') {
      this.gameSortDirection.set('desc');
      return;
    }

    this.gameSortColumn.set(null);
    this.gameSortDirection.set(null);
  }

  sortGameDetailBy(column: GameDetailSortColumn): void {
    this.updateDetailSort(this.gameDetailSortColumn, this.gameDetailSortDirection, column);
  }

  sortUsersBy(column: UserSortColumn): void {
    this.updateDetailSort(this.userSortColumn, this.userSortDirection, column);
  }

  getGameSortIndicator(column: GameSortColumn): string {
    return this.getSortIndicator(this.gameSortColumn(), this.gameSortDirection(), column);
  }

  getGameDetailSortIndicator(column: GameDetailSortColumn): string {
    return this.getSortIndicator(this.gameDetailSortColumn(), this.gameDetailSortDirection(), column);
  }

  getUserSortIndicator(column: UserSortColumn): string {
    return this.getSortIndicator(this.userSortColumn(), this.userSortDirection(), column);
  }

  formatMinutes(value: number | null | undefined): string {
    return value || value === 0 ? `${value} min` : '-';
  }

  formatHours(value: number | null | undefined): string {
    if (value == null) {
      return '-';
    }

    return `${Math.round((value / 60) * 10) / 10} h`;
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

  trackByGameRow(_: number, item: GameRankingRow): number {
    return item.juegoId;
  }

  trackByUserRow(_: number, item: UserRankingRow): number {
    return item.usuarioId;
  }

  trackByUserGameRow(_: number, item: UserGameRankingRow): number {
    return item.juegoId;
  }

  private buildGameRows(partidas: RankingPartida[], filters: GameFilters): GameRankingRow[] {
    const filtered = this.filterPartidas(partidas, filters.fechaDesde, filters.fechaHasta);
    const grouped = new Map<number, RankingPartida[]>();

    for (const partida of filtered) {
      grouped.set(partida.juegoId, [...(grouped.get(partida.juegoId) ?? []), partida]);
    }

    return Array.from(grouped.entries()).map(([juegoId, partidasJuego]) => {
      const duraciones = partidasJuego
        .map(partida => partida.duracionMinutos)
        .filter((value): value is number => value != null);

      return {
        juegoId,
        nombre: partidasJuego[0].juegoNombre,
        numeroPartidas: partidasJuego.length,
        duracionTotalMinutos: duraciones.reduce((total, value) => total + value, 0),
        duracionMediaMinutos: duraciones.length > 0
          ? Math.round(duraciones.reduce((total, value) => total + value, 0) / duraciones.length)
          : null,
        ultimaPartida: partidasJuego
          .map(partida => partida.fecha)
          .sort((a, b) => b.localeCompare(a))[0] ?? null
      };
    });
  }

  private buildUserRows(jugadores: RankingJugador[], filters: UserFilters | GameFilters): UserRankingRow[] {
    const filtered = jugadores.filter(jugador => {
      const maybeGameFilters = filters as Partial<GameFilters>;
      const juegoId = Number(maybeGameFilters.juegoId);
      if (juegoId && jugador.juegoId !== juegoId) {
        return false;
      }

      const maybeUserFilters = filters as Partial<UserFilters>;
      const usuarioId = Number(maybeUserFilters.usuarioId);
      if (usuarioId && jugador.usuarioId !== usuarioId) {
        return false;
      }

      return this.matchesDateRange(jugador.fecha, filters.fechaDesde, filters.fechaHasta);
    });

    const grouped = new Map<number, RankingJugador[]>();
    for (const jugador of filtered) {
      grouped.set(jugador.usuarioId, [...(grouped.get(jugador.usuarioId) ?? []), jugador]);
    }

    return Array.from(grouped.entries()).map(([usuarioId, rows]) => {
      const victorias = rows.filter(row => row.posicion === 1).length;

      return {
        usuarioId,
        usuarioNombre: rows[0].usuarioNombre,
        partidasTotales: rows.length,
        victorias,
        porcentajeVictoria: this.calculatePercentage(victorias, rows.length)
      };
    });
  }

  private buildUserGameRows(jugadores: RankingJugador[], filters: UserFilters): UserGameRankingRow[] {
    const usuarioId = Number(filters.usuarioId);
    const filtered = jugadores.filter(jugador =>
      jugador.usuarioId === usuarioId &&
      this.matchesDateRange(jugador.fecha, filters.fechaDesde, filters.fechaHasta)
    );

    const grouped = new Map<number, RankingJugador[]>();
    for (const jugador of filtered) {
      grouped.set(jugador.juegoId, [...(grouped.get(jugador.juegoId) ?? []), jugador]);
    }

    return Array.from(grouped.entries()).map(([juegoId, rows]) => {
      const victorias = rows.filter(row => row.posicion === 1).length;

      return {
        juegoId,
        juegoNombre: rows[0].juegoNombre,
        partidasTotales: rows.length,
        victorias,
        porcentajeVictoria: this.calculatePercentage(victorias, rows.length),
        ultimaPartida: rows
          .map(row => row.fecha)
          .sort((a, b) => b.localeCompare(a))[0] ?? null
      };
    });
  }

  private filterPartidas(partidas: RankingPartida[], fechaDesde: string, fechaHasta: string): RankingPartida[] {
    return partidas.filter(partida => this.matchesDateRange(partida.fecha, fechaDesde, fechaHasta));
  }

  private matchesDateRange(fecha: string, fechaDesde: string, fechaHasta: string): boolean {
    if (fechaDesde && fecha < fechaDesde) {
      return false;
    }

    if (fechaHasta && fecha > fechaHasta) {
      return false;
    }

    return true;
  }

  private sortGameRows(rows: GameRankingRow[]): GameRankingRow[] {
    const column = this.gameSortColumn();
    const direction = this.gameSortDirection();

    if (!column || !direction) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (column) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre) * multiplier;
        case 'partidas':
          return (a.numeroPartidas - b.numeroPartidas) * multiplier;
        case 'horas':
          return (a.duracionTotalMinutos - b.duracionTotalMinutos) * multiplier;
        case 'mitjana':
          return ((a.duracionMediaMinutos ?? 0) - (b.duracionMediaMinutos ?? 0)) * multiplier;
        case 'ultima':
          return ((a.ultimaPartida ?? '').localeCompare(b.ultimaPartida ?? '')) * multiplier;
        default:
          return 0;
      }
    });
  }

  private sortDetailRows(
    rows: UserRankingRow[],
    column: UserSortColumn | GameDetailSortColumn | null,
    direction: SortDirection | null
  ): UserRankingRow[] {
    if (!column || !direction) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (column) {
        case 'usuario':
          return a.usuarioNombre.localeCompare(b.usuarioNombre) * multiplier;
        case 'partidas':
          return (a.partidasTotales - b.partidasTotales) * multiplier;
        case 'victorias':
          return (a.victorias - b.victorias) * multiplier;
        case 'porcentaje':
          return (a.porcentajeVictoria - b.porcentajeVictoria) * multiplier;
        case 'ultima':
          return 0;
        default:
          return 0;
      }
    });
  }

  private sortUserGameRows(rows: UserGameRankingRow[]): UserGameRankingRow[] {
    const column = this.userSortColumn();
    const direction = this.userSortDirection();

    if (!column || !direction) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (column) {
        case 'joc':
          return a.juegoNombre.localeCompare(b.juegoNombre) * multiplier;
        case 'partidas':
          return (a.partidasTotales - b.partidasTotales) * multiplier;
        case 'victorias':
          return (a.victorias - b.victorias) * multiplier;
        case 'porcentaje':
          return (a.porcentajeVictoria - b.porcentajeVictoria) * multiplier;
        case 'ultima':
          return ((a.ultimaPartida ?? '').localeCompare(b.ultimaPartida ?? '')) * multiplier;
        default:
          return 0;
      }
    });
  }

  private updateDetailSort<T extends UserSortColumn | GameDetailSortColumn>(
    columnSignal: { (): T | null; set(value: T | null): void },
    directionSignal: { (): SortDirection | null; set(value: SortDirection | null): void },
    column: T
  ): void {
    if (columnSignal() !== column) {
      columnSignal.set(column);
      directionSignal.set(column === 'usuario' || column === 'joc' ? 'asc' : 'desc');
      return;
    }

    if (directionSignal() === 'asc') {
      directionSignal.set('desc');
      return;
    }

    columnSignal.set(null);
    directionSignal.set(null);
  }

  private getSortIndicator<T>(currentColumn: T | null, direction: SortDirection | null, column: T): string {
    if (currentColumn !== column || !direction) {
      return '';
    }

    return direction === 'asc' ? ' ↑' : ' ↓';
  }

  private calculatePercentage(victorias: number, partidas: number): number {
    if (partidas === 0) {
      return 0;
    }

    return Math.round((victorias * 1000) / partidas) / 10;
  }

  private updateResponsiveState(): void {
    const isMobile = window.innerWidth <= 820;
    this.isMobileFilters.set(isMobile);

    if (!isMobile) {
      this.showGameFilters.set(false);
      this.showUserFilters.set(false);
    }
  }
}
