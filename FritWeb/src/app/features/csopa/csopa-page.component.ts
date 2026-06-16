import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isExternalUser } from '../../core/users/external-user';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import {
  CSOPA_TIPUS_GYMFRIT,
  CSOPA_TIPUS_SOPAR,
  CsopaActivitat,
  CsopaService
} from './csopa.service';

type CsopaSortColumn = 'createdAt' | 'titol' | 'usuario' | 'assistencies';
type SortDirection = 'asc' | 'desc';

interface CsopaFilters {
  fechaDesde: string;
  fechaHasta: string;
  usuarioId: string;
  tipus: string;
}

interface CsopaUserOption {
  usuarioId: number;
  nombre: string;
}

const EMPTY_CSOPA_FILTERS: CsopaFilters = {
  fechaDesde: '',
  fechaHasta: '',
  usuarioId: '',
  tipus: ''
};

@Component({
  selector: 'app-csopa-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './csopa-page.component.html',
  styleUrl: './csopa-page.component.css'
})
export class CsopaPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private csopaService = inject(CsopaService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  readonly tipusSopar = CSOPA_TIPUS_SOPAR;
  readonly tipusGymfrit = CSOPA_TIPUS_GYMFRIT;

  loading = signal(true);
  savingActivity = signal(false);
  savingAttendanceId = signal<number | null>(null);
  error = signal('');
  activityFormError = signal('');
  attendanceFormError = signal('');
  activitats = signal<CsopaActivitat[]>([]);
  usuarios = signal<UsuarioOption[]>([]);
  highlightedActivitatId = signal<number | null>(null);
  attendanceOpenId = signal<number | null>(null);
  filters = signal<CsopaFilters>({ ...EMPTY_CSOPA_FILTERS });
  showFilters = signal(false);
  sortColumn = signal<CsopaSortColumn>('createdAt');
  sortDirection = signal<SortDirection>('desc');

  canPublish = computed(() => {
    const currentUser = this.authService.currentUser;
    return currentUser ? !isExternalUser(currentUser) : false;
  });

  userOptions = computed<CsopaUserOption[]>(() => {
    const users = new Map<number, string>();

    for (const activitat of this.activitats()) {
      users.set(activitat.usuarioCreadorId, activitat.usuarioCreadorNombre);

      for (const assistencia of activitat.assistencies) {
        users.set(assistencia.usuarioId, assistencia.usuarioNombre);
      }
    }

    return Array.from(users.entries())
      .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
      .filter(usuario => !isExternalUser(usuario))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  });

  filteredActivitats = computed(() => {
    const filters = this.filters();
    const usuarioId = Number(filters.usuarioId);
    const tipus = Number(filters.tipus);
    const filtered = this.activitats().filter(activitat =>
      this.matchesDateRange(activitat.createdAt, filters.fechaDesde, filters.fechaHasta) &&
      (!usuarioId || this.matchesUser(activitat, usuarioId)) &&
      (!tipus || activitat.tipus === tipus)
    );

    return this.sortActivitats(filtered);
  });

  activityForm = this.fb.group({
    titol: ['', Validators.maxLength(300)],
    tipus: [CSOPA_TIPUS_SOPAR, [Validators.required]]
  });

  attendanceForm = this.fb.group({
    usuarioId: ['', Validators.required]
  });

  ngOnInit(): void {
    this.cargarActivitats();
    this.cargarUsuarios();
  }

  cargarActivitats(): void {
    this.loading.set(true);
    this.error.set('');

    this.csopaService.getAll().subscribe({
      next: activitats => {
        this.activitats.set(activitats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'ha pogut carregar C sopa/Gymfrit.");
        this.loading.set(false);
      }
    });
  }

  cargarUsuarios(): void {
    this.usuariosService.getJugadores().subscribe({
      next: usuarios => this.usuarios.set(usuarios),
      error: () => this.usuarios.set([])
    });
  }

  publicarActivitat(): void {
    if (!this.canPublish()) {
      return;
    }

    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      this.activityFormError.set('Selecciona un tipus valid.');
      return;
    }

    const raw = this.activityForm.getRawValue();
    const tipus = Number(raw.tipus);

    if (!this.confirmActivityDate(tipus)) {
      return;
    }

    this.savingActivity.set(true);
    this.activityFormError.set('');

    this.csopaService.create({
      titol: raw.titol?.trim() || null,
      tipus
    }).subscribe({
      next: activitat => {
        this.activitats.update(current => [activitat, ...current]);
        this.highlightedActivitatId.set(activitat.csopaActivitatId);
        window.setTimeout(() => this.highlightedActivitatId.set(null), 2500);
        this.activityForm.reset({
          titol: '',
          tipus
        });
        this.savingActivity.set(false);
      },
      error: err => {
        this.activityFormError.set(err?.error?.message ?? "No s'ha pogut publicar l'activitat.");
        this.savingActivity.set(false);
      }
    });
  }

  abrirAssistencia(activitat: CsopaActivitat): void {
    if (!this.canPublish()) {
      return;
    }

    this.attendanceForm.reset({ usuarioId: '' });
    this.attendanceFormError.set('');
    this.attendanceOpenId.set(activitat.csopaActivitatId);
  }

  cancelarAssistencia(): void {
    this.attendanceOpenId.set(null);
    this.attendanceFormError.set('');
  }

  guardarAssistencia(activitat: CsopaActivitat): void {
    if (this.attendanceForm.invalid) {
      this.attendanceForm.markAllAsTouched();
      this.attendanceFormError.set('Selecciona un usuari.');
      return;
    }

    const usuarioId = Number(this.attendanceForm.controls.usuarioId.value);
    if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
      this.attendanceFormError.set('Selecciona un usuari.');
      return;
    }

    this.savingAttendanceId.set(activitat.csopaActivitatId);
    this.attendanceFormError.set('');

    this.csopaService.marcarAssistencia(activitat.csopaActivitatId, { usuarioId }).subscribe({
      next: updated => {
        this.activitats.update(current =>
          current.map(item => item.csopaActivitatId === updated.csopaActivitatId ? updated : item)
        );
        this.attendanceOpenId.set(null);
        this.savingAttendanceId.set(null);
      },
      error: err => {
        this.attendanceFormError.set(err?.error?.message ?? "No s'ha pogut marcar l'assistencia.");
        this.savingAttendanceId.set(null);
      }
    });
  }

  updateFilter<K extends keyof CsopaFilters>(key: K, value: string): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  clearFilters(): void {
    this.filters.set({ ...EMPTY_CSOPA_FILTERS });
    this.sortColumn.set('createdAt');
    this.sortDirection.set('desc');
  }

  toggleFilters(): void {
    if (this.showFilters()) {
      this.clearFilters();
      this.showFilters.set(false);
      return;
    }

    this.showFilters.set(true);
  }

  sortBy(column: CsopaSortColumn): void {
    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'titol' || column === 'usuario' ? 'asc' : 'desc');
      return;
    }

    this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByActivitatId(_: number, activitat: CsopaActivitat): number {
    return activitat.csopaActivitatId;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  formatAssistencies(activitat: CsopaActivitat): string {
    return activitat.assistencies.map(assistencia => assistencia.usuarioNombre).join(', ');
  }

  getTipusLabel(tipus: number): string {
    return tipus === CSOPA_TIPUS_GYMFRIT ? 'Gymfrit' : 'Sopar';
  }

  getTipusIcon(tipus: number): string {
    return tipus === CSOPA_TIPUS_GYMFRIT ? 'assets/gymfrit.png' : 'assets/sopar.png';
  }

  getSortIndicator(column: CsopaSortColumn): string {
    if (this.sortColumn() !== column) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  private matchesDateRange(value: string, fechaDesde: string, fechaHasta: string): boolean {
    const fecha = value.slice(0, 10);

    if (fechaDesde && fecha < fechaDesde) {
      return false;
    }

    if (fechaHasta && fecha > fechaHasta) {
      return false;
    }

    return true;
  }

  private matchesUser(activitat: CsopaActivitat, usuarioId: number): boolean {
    return activitat.usuarioCreadorId === usuarioId ||
      activitat.assistencies.some(assistencia => assistencia.usuarioId === usuarioId);
  }

  private sortActivitats(activitats: CsopaActivitat[]): CsopaActivitat[] {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...activitats].sort((left, right) => {
      switch (column) {
        case 'titol':
          return left.titol.localeCompare(right.titol) * multiplier;
        case 'usuario':
          return left.usuarioCreadorNombre.localeCompare(right.usuarioCreadorNombre) * multiplier;
        case 'assistencies':
          return (left.assistencies.length - right.assistencies.length) * multiplier ||
            right.createdAt.localeCompare(left.createdAt);
        case 'createdAt':
        default:
          return left.createdAt.localeCompare(right.createdAt) * multiplier;
      }
    });
  }

  private confirmActivityDate(tipus: number): boolean {
    const day = new Date().getDay();

    if (tipus === CSOPA_TIPUS_SOPAR && day !== 2) {
      return window.confirm("Estas publicant un sopar en una data que no es dimarts. Vols continuar?");
    }

    if (tipus === CSOPA_TIPUS_GYMFRIT && day !== 4) {
      return window.confirm("Estas publicant un Gymfrit en una data que no es dijous. Vols continuar?");
    }

    return true;
  }
}
