import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isExternalUser } from '../../core/users/external-user';
import { MenuComponent } from '../../shared/menu/menu.component';
import { CinePelicula, CineService } from './cine.service';

@Component({
  selector: 'app-cine-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './cine-page.component.html',
  styleUrl: './cine-page.component.css'
})
export class CinePageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cineService = inject(CineService);
  private router = inject(Router);

  loading = signal(true);
  savingMovie = signal(false);
  savingRatingId = signal<number | null>(null);
  error = signal('');
  movieFormError = signal('');
  ratingFormError = signal('');
  showObservacions = signal(false);
  peliculas = signal<CinePelicula[]>([]);
  highlightedPeliculaId = signal<number | null>(null);
  ratingOpenId = signal<number | null>(null);

  canPublish = computed(() => {
    const currentUser = this.authService.currentUser;
    return currentUser ? !isExternalUser(currentUser) : false;
  });

  movieForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(300)]]
  });

  ratingForm = this.fb.group({
    nota: ['', [Validators.required, this.notaValidator]],
    observacion: ['', Validators.maxLength(200)]
  });

  ngOnInit(): void {
    this.cargarPeliculas();
  }

  cargarPeliculas(): void {
    this.loading.set(true);
    this.error.set('');

    this.cineService.getAll().subscribe({
      next: peliculas => {
        this.peliculas.set(peliculas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'ha pogut carregar Cine.");
        this.loading.set(false);
      }
    });
  }

  publicarPelicula(): void {
    if (!this.canPublish()) {
      return;
    }

    if (this.movieForm.invalid) {
      this.movieForm.markAllAsTouched();
      this.movieFormError.set('Escriu el títol de la pel·lícula.');
      return;
    }

    const titulo = this.movieForm.controls.titulo.value?.trim() ?? '';

    this.savingMovie.set(true);
    this.movieFormError.set('');

    this.cineService.create({ titulo }).subscribe({
      next: pelicula => {
        this.peliculas.update(current => [pelicula, ...current]);
        this.highlightedPeliculaId.set(pelicula.cinePeliculaId);
        window.setTimeout(() => this.highlightedPeliculaId.set(null), 2500);
        this.movieForm.reset({ titulo: '' });
        this.savingMovie.set(false);
      },
      error: err => {
        this.movieFormError.set(err?.error?.message ?? "No s'ha pogut publicar la pel·lícula.");
        this.savingMovie.set(false);
      }
    });
  }

  abrirValoracion(pelicula: CinePelicula): void {
    if (!pelicula.puedeValorar) {
      return;
    }

    this.ratingForm.reset({
      nota: '',
      observacion: ''
    });
    this.ratingFormError.set('');
    this.ratingOpenId.set(pelicula.cinePeliculaId);
  }

  cancelarValoracion(): void {
    this.ratingOpenId.set(null);
    this.ratingFormError.set('');
  }

  guardarValoracion(pelicula: CinePelicula): void {
    const raw = this.ratingForm.getRawValue();
    const nota = this.parseNota(raw.nota ?? '');

    if (this.ratingForm.invalid || nota === null) {
      this.ratingForm.markAllAsTouched();
      this.ratingFormError.set('La nota és obligatòria i ha d\'anar de 0 a 10.');
      return;
    }

    this.savingRatingId.set(pelicula.cinePeliculaId);
    this.ratingFormError.set('');

    this.cineService.valorar(pelicula.cinePeliculaId, {
      nota,
      observacion: raw.observacion?.trim() || null
    }).subscribe({
      next: updated => {
        this.peliculas.update(current =>
          current.map(item => item.cinePeliculaId === updated.cinePeliculaId ? updated : item)
        );
        this.ratingOpenId.set(null);
        this.savingRatingId.set(null);
      },
      error: err => {
        this.ratingFormError.set(err?.error?.message ?? "No s'ha pogut guardar la valoració.");
        this.savingRatingId.set(null);
      }
    });
  }

  toggleObservacions(): void {
    this.showObservacions.update(value => !value);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByPeliculaId(_: number, pelicula: CinePelicula): number {
    return pelicula.cinePeliculaId;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMedia(pelicula: CinePelicula): string {
    if (pelicula.mediaNota === null || pelicula.mediaNota === undefined) {
      return '-';
    }

    return `${this.formatNumber(pelicula.mediaNota)} (${this.formatValoraciones(pelicula)})`;
  }

  formatValoraciones(pelicula: CinePelicula): string {
    return pelicula.valoraciones
      .map(valoracion => `${valoracion.usuarioNombre} ${this.formatNumber(valoracion.nota)}`)
      .join(', ');
  }

  formatObservacions(pelicula: CinePelicula): string {
    const observacions = pelicula.valoraciones
      .filter(valoracion => !!valoracion.observacion)
      .map(valoracion => `${valoracion.usuarioNombre}: ${valoracion.observacion}`);

    return observacions.length > 0 ? observacions.join(' | ') : '-';
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('ca-ES', {
      maximumFractionDigits: 2
    }).format(value);
  }

  private parseNota(value: string): number | null {
    const normalized = value.trim().replace(',', '.');
    const parsed = Number(normalized);

    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10 ? parsed : null;
  }

  private notaValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    const parsed = Number(value.replace(',', '.'));

    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10
      ? null
      : { notaRange: true };
  }
}
