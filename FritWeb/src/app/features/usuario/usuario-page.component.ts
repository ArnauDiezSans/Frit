import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioDetalle, UsuarioJuegoOrden, UsuarioService } from './usuario.service';

@Component({
  selector: 'app-usuario-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './usuario-page.component.html',
  styleUrl: './usuario-page.component.css'
})
export class UsuarioPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
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

  usuario = signal<UsuarioDetalle | null>(null);
  juegosOrdenados = signal<UsuarioJuegoOrden[]>([]);
  scoreSearch = signal<Partial<Record<number, string>>>({});
  filteredScoreGames = signal<UsuarioJuegoOrden[]>([]);
  showScoreOptions = signal<number | null>(null);

  readonly scoreValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  private readonly scoreLimits = new Map<number, number>([
    [10, 1],
    [9, 2],
    [8, 3],
    [7, 4],
    [6, 5]
  ]);

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
      juegos: this.usuarioService.getJuegosOrden(currentUser.usuarioId)
    }).subscribe({
      next: result => {
        this.usuario.set(result.usuario);
        this.juegosOrdenados.set(this.sortJuegos(result.juegos));
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

  getScoreLimit(score: number): number | null {
    return this.scoreLimits.get(score) ?? null;
  }

  getScoreLabel(score: number): string {
    const count = this.getScoreGames(score).length;
    const limit = this.getScoreLimit(score);

    return limit === null ? `${count}` : `${count}/${limit}`;
  }

  isScoreFull(score: number): boolean {
    const limit = this.getScoreLimit(score);
    return limit !== null && this.getScoreGames(score).length >= limit;
  }

  onScoreInput(score: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
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
    if (this.savingOrder()) {
      return;
    }

    const current = this.juegosOrdenados();
    const selected = current.find(item => item.juegoId === juego.juegoId);

    if (!selected || selected.puntuacion === score) {
      this.clearScoreSearch(score);
      return;
    }

    if (!this.canMoveToScore(score, selected.juegoId)) {
      this.orderError.set(`La puntuacio ${score} ja esta plena.`);
      return;
    }

    const previous = current.map(item => ({ ...item }));
    const next = current.map(item =>
      item.juegoId === selected.juegoId ? { ...item, puntuacion: score } : { ...item }
    );

    this.juegosOrdenados.set(this.sortJuegos(next));
    this.clearScoreSearch(score);
    this.persistirPuntuaciones(previous);
  }

  private canMoveToScore(score: number, juegoId: number): boolean {
    const limit = this.getScoreLimit(score);

    if (limit === null) {
      return true;
    }

    return this.juegosOrdenados().filter(juego =>
      juego.puntuacion === score &&
      juego.juegoId !== juegoId
    ).length < limit;
  }

  private getFilteredGames(score: number, filter: string): UsuarioJuegoOrden[] {
    const normalized = filter.trim().toLowerCase();

    return this.juegosOrdenados()
      .filter(juego =>
        juego.puntuacion !== score &&
        this.canMoveToScore(score, juego.juegoId) &&
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

  private sortJuegos(juegos: UsuarioJuegoOrden[]): UsuarioJuegoOrden[] {
    return juegos
      .map(juego => ({ ...juego }))
      .sort((left, right) =>
        right.puntuacion - left.puntuacion ||
        left.nombre.localeCompare(right.nombre)
      );
  }
}
