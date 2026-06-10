import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isExternalUser } from '../../core/users/external-user';
import { MenuComponent } from '../../shared/menu/menu.component';
import {
  RankingJugador,
  RankingJuego,
  RankingPartida,
  Rankings,
  RankingsService
} from './rankings.service';

type GameSortColumn = 'nombre' | 'partidas' | 'horas' | 'mitjana' | 'ultima';
type UserSortColumn = 'usuario' | 'joc' | 'partidas' | 'horas' | 'victorias' | 'posicionRelativa' | 'porcentaje' | 'ultima';
type GameDetailSortColumn = 'usuario' | 'partidas' | 'victorias' | 'posicionRelativa' | 'porcentaje';
type SortDirection = 'asc' | 'desc';
type ActiveRankingView = 'game' | 'user';

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
  duracionTotalMinutos: number;
  victorias: number;
  posicionRelativa: number;
  porcentajeVictoria: number;
}

interface UserGameRankingRow {
  juegoId: number;
  juegoNombre: string;
  partidasTotales: number;
  duracionTotalMinutos: number;
  victorias: number;
  posicionRelativa: number;
  porcentajeVictoria: number;
  ultimaPartida: string | null;
}

interface GameFilters {
  juegoId: string;
  fechaDesde: string;
  fechaHasta: string;
  minPartidas: string;
}

interface UserFilters {
  usuarioId: string;
  fechaDesde: string;
  fechaHasta: string;
  minPartidas: string;
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
  posicionRelativa: boolean;
  porcentaje: boolean;
}

interface UserColumns {
  usuario: boolean;
  joc: boolean;
  partidas: boolean;
  horas: boolean;
  victorias: boolean;
  posicionRelativa: boolean;
  porcentaje: boolean;
  ultima: boolean;
}

const EMPTY_GAME_FILTERS: GameFilters = {
  juegoId: '',
  fechaDesde: '',
  fechaHasta: '',
  minPartidas: ''
};

const EMPTY_USER_FILTERS: UserFilters = {
  usuarioId: '',
  fechaDesde: '',
  fechaHasta: '',
  minPartidas: ''
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
  activeRankingView = signal<ActiveRankingView>('game');

  gameFilters = signal<GameFilters>({ ...EMPTY_GAME_FILTERS });
  userFilters = signal<UserFilters>({ ...EMPTY_USER_FILTERS });
  showNoLlistaGames = signal(false);
  showCooperativeGames = signal(false);

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
    posicionRelativa: true,
    porcentaje: true
  });

  userColumns = signal<UserColumns>({
    usuario: true,
    joc: true,
    partidas: true,
    horas: true,
    victorias: true,
    posicionRelativa: true,
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

    return this.filterRankingJuegos(data.juegos)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  userOptions = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const users = new Map<number, string>();
    for (const jugador of this.filterRankingJugadores(data.jugadores)) {
      if (this.isExternalRankingJugador(jugador)) {
        continue;
      }

      users.set(jugador.usuarioId, jugador.usuarioNombre);
    }

    return Array.from(users.entries())
      .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
      .filter(usuario => !isExternalUser(usuario))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  selectedGameName = computed(() => {
    const juegoId = Number(this.gameFilters().juegoId);
    return this.gameOptions().find(juego => juego.juegoId === juegoId)?.nombre ?? '';
  });

  selectedGameTotalPartidas = computed(() => {
    const data = this.rankings();
    const filters = this.gameFilters();
    const juegoId = Number(filters.juegoId);

    if (!data || !juegoId) {
      return 0;
    }

    return this.filterPartidas(
      this.filterRankingPartidas(data.partidas)
        .filter(partida => partida.juegoId === juegoId),
      filters.fechaDesde,
      filters.fechaHasta
    ).length;
  });

  selectedUserName = computed(() => {
    const usuarioId = Number(this.userFilters().usuarioId);
    return this.userOptions().find(usuario => usuario.usuarioId === usuarioId)?.nombre ?? '';
  });

  topUserByGames = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      { ...EMPTY_USER_FILTERS }
    )
      .sort((a, b) =>
        b.partidasTotales - a.partidasTotales ||
        b.victorias - a.victorias ||
        a.usuarioNombre.localeCompare(b.usuarioNombre)
      )[0] ?? null;
  });

  topUserByWinrate = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      { ...EMPTY_USER_FILTERS }
    )
      .sort((a, b) =>
        b.porcentajeVictoria - a.porcentajeVictoria ||
        b.partidasTotales - a.partidasTotales ||
        a.usuarioNombre.localeCompare(b.usuarioNombre)
      )[0] ?? null;
  });

  topGameByActivity = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.buildGameRows(this.filterRankingPartidas(data.partidas), { ...EMPTY_GAME_FILTERS })
      .sort((a, b) =>
        b.numeroPartidas - a.numeroPartidas ||
        a.nombre.localeCompare(b.nombre)
      )[0] ?? null;
  });

  longestGame = computed(() => {
    const data = this.rankings();
    if (!data) {
      return null;
    }

    return this.filterRankingPartidas(data.partidas)
      .filter(partida => partida.duracionMinutos !== null && partida.duracionMinutos !== undefined)
      .sort((a, b) =>
        (b.duracionMinutos ?? 0) - (a.duracionMinutos ?? 0) ||
        b.fecha.localeCompare(a.fecha)
      )[0] ?? null;
  });

  gameRows = computed(() => {
    const data = this.rankings();
    if (!data) {
      return [];
    }

    const rows = this.buildGameRows(this.filterRankingPartidas(data.partidas), this.gameFilters());
    return this.sortGameRows(rows);
  });

  selectedGameRows = computed(() => {
    const data = this.rankings();
    const juegoId = Number(this.gameFilters().juegoId);
    if (!data || !juegoId) {
      return [];
    }

    const rows = this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => jugador.juegoId === juegoId && !this.isExternalRankingJugador(jugador)),
      {
        juegoId: String(juegoId),
        fechaDesde: this.gameFilters().fechaDesde,
        fechaHasta: this.gameFilters().fechaHasta,
        minPartidas: this.gameFilters().minPartidas
      }
    );

    return this.sortDetailRows(rows, this.gameDetailSortColumn(), this.gameDetailSortDirection());
  });

  userRows = computed(() => {
    const data = this.rankings();
    if (!data || this.userFilters().usuarioId) {
      return [];
    }

    const rows = this.buildUserRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      this.userFilters()
    );
    return this.sortDetailRows(rows, this.userSortColumn(), this.userSortDirection());
  });

  selectedUserGameRows = computed(() => {
    const data = this.rankings();
    const usuarioId = Number(this.userFilters().usuarioId);
    if (!data || !usuarioId) {
      return [];
    }

    const rows = this.buildUserGameRows(
      this.filterRankingJugadores(data.jugadores)
        .filter(jugador => !this.isExternalRankingJugador(jugador)),
      this.userFilters()
    );
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

  selectRankingView(view: ActiveRankingView): void {
    this.activeRankingView.set(view);
    this.showGameColumnsPanel.set(false);
    this.showUserColumnsPanel.set(false);
  }

  clearGameFilters(): void {
    this.gameFilters.set({ ...EMPTY_GAME_FILTERS });
    this.clearGameTypeFilters();
  }

  clearUserFilters(): void {
    this.userFilters.set({ ...EMPTY_USER_FILTERS });
    this.clearGameTypeFilters();
  }

  toggleGameFilters(): void {
    if (this.showGameFilters()) {
      this.clearGameFilters();
      this.showGameFilters.set(false);
      return;
    }

    this.showGameFilters.set(true);
  }

  toggleUserFilters(): void {
    if (this.showUserFilters()) {
      this.clearUserFilters();
      this.showUserFilters.set(false);
      return;
    }

    this.showUserFilters.set(true);
  }

  toggleShowNoLlistaGames(): void {
    this.showNoLlistaGames.update(value => !value);
  }

  toggleShowCooperativeGames(): void {
    this.showCooperativeGames.update(value => !value);
  }

  private clearGameTypeFilters(): void {
    this.showNoLlistaGames.set(false);
    this.showCooperativeGames.set(false);
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
      posicionRelativa: nextValue,
      porcentaje: nextValue
    });
  }

  selectAllUserColumns(): void {
    const nextValue = !this.allUserColumnsSelected();
    this.userColumns.set({
      usuario: nextValue,
      joc: nextValue,
      partidas: nextValue,
      horas: nextValue,
      victorias: nextValue,
      posicionRelativa: nextValue,
      porcentaje: nextValue,
      ultima: nextValue
    });
  }

  sortGamesBy(column: GameSortColumn): void {
    const currentColumn = this.gameSortColumn();
    const currentDirection = this.gameSortDirection();

    if (currentColumn !== column) {
      this.gameSortColumn.set(column);
      this.gameSortDirection.set('desc');
      return;
    }

    if (currentDirection === 'desc') {
      this.gameSortDirection.set('asc');
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

  private isExternalRankingJugador(jugador: RankingJugador): boolean {
    return isExternalUser({
      usuarioId: jugador.usuarioId,
      nombre: jugador.usuarioNombre
    });
  }

  private filterRankingJuegos(juegos: RankingJuego[]): RankingJuego[] {
    return juegos.filter(juego => this.shouldShowGameType(juego.tipo));
  }

  private filterRankingPartidas(partidas: RankingPartida[]): RankingPartida[] {
    return partidas.filter(partida => this.shouldShowGameType(partida.juegoTipo));
  }

  private filterRankingJugadores(jugadores: RankingJugador[]): RankingJugador[] {
    return jugadores.filter(jugador => this.shouldShowGameType(jugador.juegoTipo));
  }

  private shouldShowGameType(value: string | null | undefined): boolean {
    if (this.isNoLlistaType(value)) {
      return this.showNoLlistaGames();
    }

    if (this.isCooperativeType(value)) {
      return this.showCooperativeGames();
    }

    return true;
  }

  private isNoLlistaType(value: string | null | undefined): boolean {
    return (value ?? '').trim().toLowerCase() === 'no llista';
  }

  private isCooperativeType(value: string | null | undefined): boolean {
    return (value ?? '').trim().toLowerCase() === 'cooperatiu';
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
    }).filter(row => this.matchesMinPartidas(row.numeroPartidas, filters.minPartidas));
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
      const duracionTotalMinutos = rows.reduce((total, row) => total + (row.duracionMinutos ?? 0), 0);
      const posicionRelativa = this.calculateAverageRelativePosition(rows);

      return {
        usuarioId,
        usuarioNombre: rows[0].usuarioNombre,
        partidasTotales: rows.length,
        duracionTotalMinutos,
        victorias,
        posicionRelativa,
        porcentajeVictoria: this.calculatePercentage(victorias, rows.length)
      };
    }).filter(row => this.matchesMinPartidas(row.partidasTotales, filters.minPartidas));
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
      const duracionTotalMinutos = rows.reduce((total, row) => total + (row.duracionMinutos ?? 0), 0);
      const posicionRelativa = this.calculateAverageRelativePosition(rows);

      return {
        juegoId,
        juegoNombre: rows[0].juegoNombre,
        partidasTotales: rows.length,
        duracionTotalMinutos,
        victorias,
        posicionRelativa,
        porcentajeVictoria: this.calculatePercentage(victorias, rows.length),
        ultimaPartida: rows
          .map(row => row.fecha)
          .sort((a, b) => b.localeCompare(a))[0] ?? null
      };
    }).filter(row => this.matchesMinPartidas(row.partidasTotales, filters.minPartidas));
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

  private matchesMinPartidas(partidas: number, minPartidas: string): boolean {
    const min = Number(minPartidas);
    return !min || partidas >= min;
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
        case 'horas':
          return (a.duracionTotalMinutos - b.duracionTotalMinutos) * multiplier;
        case 'victorias':
          return (a.victorias - b.victorias) * multiplier;
        case 'posicionRelativa':
          return (a.posicionRelativa - b.posicionRelativa) * multiplier;
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
        case 'horas':
          return (a.duracionTotalMinutos - b.duracionTotalMinutos) * multiplier;
        case 'victorias':
          return (a.victorias - b.victorias) * multiplier;
        case 'posicionRelativa':
          return (a.posicionRelativa - b.posicionRelativa) * multiplier;
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
      directionSignal.set('desc');
      return;
    }

    if (directionSignal() === 'desc') {
      directionSignal.set('asc');
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

  private calculateAverageRelativePosition(rows: RankingJugador[]): number {
    if (rows.length === 0) {
      return 0;
    }

    const total = rows.reduce((sum, row) =>
      sum + this.calculateRelativePosition(row.posicion, row.numeroJugadores),
      0
    );

    return Math.round((total * 10) / rows.length) / 10;
  }

  private calculateRelativePosition(posicion: number, numeroJugadores: number): number {
    if (numeroJugadores <= 1) {
      return 100;
    }

    return Math.floor(((numeroJugadores - posicion) * 100) / (numeroJugadores - 1));
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
