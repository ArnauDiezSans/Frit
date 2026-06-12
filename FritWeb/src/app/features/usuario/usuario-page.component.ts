import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AutocompleteSelectComponent } from '../../shared/autocomplete-select/autocomplete-select.component';
import { MenuComponent } from '../../shared/menu/menu.component';
import { HallOfFameService, MedalProgress } from '../hall-of-fame/hall-of-fame.service';
import { UsuarioDetalle, UsuarioJuegoOrden, UsuarioService } from './usuario.service';

@Component({
  selector: 'app-usuario-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent, AutocompleteSelectComponent],
  templateUrl: './usuario-page.component.html',
  styleUrl: './usuario-page.component.css'
})
export class UsuarioPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private hallOfFameService = inject(HallOfFameService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  savingOrder = signal(false);
  error = signal('');
  formError = signal('');
  orderError = signal('');
  success = signal('');
  modalOpen = signal(false);
  profileModalOpen = signal(false);
  activeUserPanel = signal<'medals' | 'favorites'>('medals');

  usuario = signal<UsuarioDetalle | null>(null);
  juegosOrdenados = signal<UsuarioJuegoOrden[]>([]);
  medals = signal<MedalProgress[]>([]);
  scoreSearch = signal<Partial<Record<number, string>>>({});
  filteredScoreGames = signal<UsuarioJuegoOrden[]>([]);
  showScoreOptions = signal<number | null>(null);
  draggedJuegoId = signal<number | null>(null);
  dragOverScore = signal<number | null>(null);

  readonly scoreValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  displayJuego = (juego: UsuarioJuegoOrden) => juego.nombre;
  displayPuntuacion = (juego: UsuarioJuegoOrden) => String(juego.puntuacion);

  passwordForm = this.fb.group(
    {
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.maxLength(24)]],
      confirmPassword: ['', [Validators.required, Validators.maxLength(24)]]
    },
    {
      validators: control => {
        const newPassword = control.get('newPassword')?.value;
        const confirmPassword = control.get('confirmPassword')?.value;
        return newPassword === confirmPassword ? null : { passwordMismatch: true };
      }
    }
  );

  profileForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    grupo: ['', Validators.maxLength(200)],
    observaciones: ['', Validators.maxLength(800)]
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    forkJoin({
      usuario: this.usuarioService.getById(currentUser.usuarioId),
      juegos: this.usuarioService.getJuegosOrden(currentUser.usuarioId),
      medals: this.authService.canViewHallOfFame()
        ? this.hallOfFameService.getUserMedals(currentUser.usuarioId)
        : of({ usuarioId: currentUser.usuarioId, usuarioNombre: currentUser.nombre, medals: [] })
    }).subscribe({
      next: result => {
        this.usuario.set(result.usuario);
        this.juegosOrdenados.set(this.sortJuegos(result.juegos));
        this.medals.set(result.medals.medals);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar les dades de l'usuari.");
        this.loading.set(false);
      }
    });
  }

  abrirModalPassword(): void {
    this.passwordForm.reset({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);
  }

  cerrarModalPassword(): void {
    this.modalOpen.set(false);
    this.formError.set('');
  }

  abrirModalPerfil(): void {
    const user = this.usuario();
    if (!user) {
      return;
    }

    this.profileForm.reset({
      nombre: user.nombre,
      grupo: user.grupo ?? '',
      observaciones: user.observaciones ?? ''
    });
    this.formError.set('');
    this.success.set('');
    this.profileModalOpen.set(true);
  }

  cerrarModalPerfil(): void {
    this.profileModalOpen.set(false);
    this.formError.set('');
  }

  guardarPerfil(): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.formError.set('Revisa els camps del perfil.');
      return;
    }

    const raw = this.profileForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');

    this.usuarioService.updateProfile(currentUser.usuarioId, {
      nombre: raw.nombre?.trim() ?? '',
      grupo: raw.grupo?.trim() || null,
      observaciones: raw.observaciones?.trim() || null
    }).subscribe({
      next: usuario => {
        this.usuario.set(usuario);
        this.authService.currentUser = {
          ...currentUser,
          nombre: usuario.nombre
        };
        this.saving.set(false);
        this.cerrarModalPerfil();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? "No s'ha pogut guardar el perfil.");
      }
    });
  }

  guardarPassword(): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.formError.set('Revisa els camps de contrasenya.');
      return;
    }

    const raw = this.passwordForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');
    this.success.set('');

    this.usuarioService
      .changePassword(currentUser.usuarioId, {
        oldPassword: raw.oldPassword ?? '',
        newPassword: raw.newPassword ?? ''
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set('Contrasenya actualitzada correctament.');
          this.cerrarModalPassword();
        },
        error: err => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? "No s'ha pogut canviar la contrasenya.");
        }
      });
  }

  getScoreGames(score: number): UsuarioJuegoOrden[] {
    return this.juegosOrdenados()
      .filter(juego => juego.puntuacion === score)
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  }

  getScoreLabel(score: number): string {
    return String(this.getScoreGames(score).length);
  }

  canShowScorePicker(score: number): boolean {
    return !this.savingOrder() && this.getFilteredGames(score, '').length > 0;
  }

  onScoreInput(score: number, value: string): void {
    this.scoreSearch.update(current => ({
      ...current,
      [score]: value
    }));
    this.showScoreOptions.set(score);
    this.filteredScoreGames.set(this.getFilteredGames(score, value));
  }

  onScoreFocus(score: number): void {
    this.showScoreOptions.set(score);
    this.filteredScoreGames.set(this.getFilteredGames(score, this.scoreSearch()[score] ?? ''));
  }

  seleccionarJuegoPuntuacion(score: number, juego: UsuarioJuegoOrden): void {
    if (this.moveJuegoToScore(score, juego.juegoId)) {
      this.clearScoreSearch(score);
    }
  }

  onJuegoDragStart(event: DragEvent, juego: UsuarioJuegoOrden): void {
    if (this.savingOrder()) {
      event.preventDefault();
      return;
    }

    this.draggedJuegoId.set(juego.juegoId);
    event.dataTransfer?.setData('text/plain', String(juego.juegoId));

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onJuegoDragEnd(): void {
    this.draggedJuegoId.set(null);
    this.dragOverScore.set(null);
  }

  onScoreDragOver(score: number, event: DragEvent): void {
    const juegoId = this.getDraggedJuegoId(event);

    if (juegoId === null || this.savingOrder()) {
      return;
    }

    event.preventDefault();
    this.dragOverScore.set(score);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onScoreDragLeave(score: number, event: DragEvent): void {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const nextTarget = event.relatedTarget as Node | null;

    if (!currentTarget || !nextTarget || !currentTarget.contains(nextTarget)) {
      if (this.dragOverScore() === score) {
        this.dragOverScore.set(null);
      }
    }
  }

  onScoreDrop(score: number, event: DragEvent): void {
    event.preventDefault();

    const juegoId = this.getDraggedJuegoId(event);
    this.draggedJuegoId.set(null);
    this.dragOverScore.set(null);

    if (juegoId !== null) {
      this.moveJuegoToScore(score, juegoId);
    }
  }

  private moveJuegoToScore(score: number, juegoId: number): boolean {
    if (this.savingOrder()) {
      return false;
    }

    const current = this.juegosOrdenados();
    const selected = current.find(item => item.juegoId === juegoId);

    if (!selected || selected.puntuacion === score) {
      return false;
    }

    const previous = current.map(item => ({ ...item }));
    const next = current.map(item =>
      item.juegoId === selected.juegoId ? { ...item, puntuacion: score } : { ...item }
    );

    this.juegosOrdenados.set(this.sortJuegos(next));
    this.persistirPuntuaciones(previous);
    return true;
  }

  private getFilteredGames(score: number, filter: string): UsuarioJuegoOrden[] {
    const normalized = filter.trim().toLowerCase();

    return this.juegosOrdenados()
      .filter(juego =>
        juego.puntuacion !== score &&
        (!normalized || juego.nombre.toLowerCase().includes(normalized))
      )
      .sort((left, right) =>
        right.puntuacion - left.puntuacion ||
        left.nombre.localeCompare(right.nombre)
      )
      .slice(0, 8);
  }

  private clearScoreSearch(score: number): void {
    this.scoreSearch.update(current => ({
      ...current,
      [score]: ''
    }));
    this.filteredScoreGames.set([]);
    this.showScoreOptions.set(null);
  }

  private getDraggedJuegoId(event: DragEvent): number | null {
    const draggedId = this.draggedJuegoId();

    if (draggedId !== null) {
      return draggedId;
    }

    const dataTransferValue = event.dataTransfer?.getData('text/plain');
    const parsed = Number(dataTransferValue);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private persistirPuntuaciones(previous: UsuarioJuegoOrden[]): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.savingOrder.set(true);
    this.orderError.set('');

    this.usuarioService
      .updateJuegosOrden(currentUser.usuarioId, {
        juegos: this.juegosOrdenados().map(juego => ({
          juegoId: juego.juegoId,
          puntuacion: juego.puntuacion
        }))
      })
      .subscribe({
        next: () => {
          this.savingOrder.set(false);
        },
        error: err => {
          this.juegosOrdenados.set(previous);
          this.savingOrder.set(false);
          this.orderError.set(err?.error?.message ?? "No s'ha pogut guardar la puntuacio dels jocs.");
        }
      });
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

  trackByJuego(_: number, juego: UsuarioJuegoOrden): number {
    return juego.juegoId;
  }

  trackByScore(_: number, score: number): number {
    return score;
  }

  trackByMedal(_: number, medal: MedalProgress): string {
    return medal.medalId;
  }

  getMedalProgressWidth(medal: MedalProgress): string {
    if (medal.targetValue <= 0) {
      return '0%';
    }

    return `${Math.min(100, Math.round((medal.currentValue / medal.targetValue) * 100))}%`;
  }

  canViewMedals(): boolean {
    return this.authService.canViewHallOfFame();
  }

  setActiveUserPanel(panel: 'medals' | 'favorites'): void {
    this.activeUserPanel.set(panel);
  }

  useDefaultMedalIcon(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (image && !image.src.endsWith('/assets/medallas/default-medal.svg')) {
      image.src = '/assets/medallas/default-medal.svg';
    }
  }

  private sortJuegos(juegos: UsuarioJuegoOrden[]): UsuarioJuegoOrden[] {
    return juegos
      .map(juego => ({ ...juego }))
      .sort((left, right) =>
        right.puntuacion - left.puntuacion ||
        left.nombre.localeCompare(right.nombre)
      );
  }
}
