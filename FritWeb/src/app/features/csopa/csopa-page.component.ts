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

type CsopaSortColumn = 'createdAt' | 'usuario' | 'assistencies';
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
  deletingActivityId = signal<number | null>(null);
  deletingAttendanceId = signal<number | null>(null);
  error = signal('');
  activityFormError = signal('');
  attendanceFormError = signal('');
  editFormError = signal('');
  activitats = signal<CsopaActivitat[]>([]);
  usuarios = signal<UsuarioOption[]>([]);
  highlightedActivitatId = signal<number | null>(null);
  attendanceOpenId = signal<number | null>(null);
  editOpenId = signal<number | null>(null);
  filters = signal<CsopaFilters>({ ...EMPTY_CSOPA_FILTERS });
  showFilters = signal(false);
  sortColumn = signal<CsopaSortColumn>('createdAt');
  sortDirection = signal<SortDirection>('desc');

  canPublish = computed(() => {
    const currentUser = this.authService.currentUser;
    return currentUser ? !isExternalUser(currentUser) : false;
  });

  canEdit = computed(() => this.authService.currentUser?.nombre === 'Arnau');

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
    fecha: [this.getTodayInputValue(), Validators.required],
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
    const fecha = raw.fecha ?? this.getTodayInputValue();

    if (!this.confirmActivityDate(tipus, fecha)) {
      return;
    }

    this.savingActivity.set(true);
    this.activityFormError.set('');

    this.csopaService.create({
      tipus,
      fecha
    }).subscribe({
      next: activitat => {
        this.activitats.update(current => [activitat, ...current]);
        this.highlightedActivitatId.set(activitat.csopaActivitatId);
        window.setTimeout(() => this.highlightedActivitatId.set(null), 2500);
        this.activityForm.reset({
          fecha: this.getTodayInputValue(),
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

    this.editOpenId.set(null);
    this.attendanceForm.reset({ usuarioId: '' });
    this.attendanceFormError.set('');
    this.attendanceOpenId.set(activitat.csopaActivitatId);
  }

  cancelarAssistencia(): void {
    this.attendanceOpenId.set(null);
    this.attendanceFormError.set('');
  }

  toggleEditar(activitat: CsopaActivitat): void {
    if (!this.canEdit()) {
      return;
    }

    this.attendanceOpenId.set(null);
    this.editFormError.set('');
    this.editOpenId.update(current => current === activitat.csopaActivitatId ? null : activitat.csopaActivitatId);
  }

  eliminarActivitat(activitat: CsopaActivitat): void {
    if (!this.canEdit()) {
      return;
    }

    if (!window.confirm(`Eliminar ${this.getTipusLabel(activitat.tipus)} del ${this.formatDate(activitat.createdAt)}?`)) {
      return;
    }

    this.deletingActivityId.set(activitat.csopaActivitatId);
    this.editFormError.set('');

    this.csopaService.deleteActivitat(activitat.csopaActivitatId).subscribe({
      next: () => {
        this.activitats.update(current =>
          current.filter(item => item.csopaActivitatId !== activitat.csopaActivitatId)
        );
        this.editOpenId.set(null);
        this.deletingActivityId.set(null);
      },
      error: err => {
        this.editFormError.set(err?.error?.message ?? "No s'ha pogut eliminar l'activitat.");
        this.deletingActivityId.set(null);
      }
    });
  }

  eliminarAssistencia(activitat: CsopaActivitat, assistenciaId: number): void {
    if (!this.canEdit()) {
      return;
    }

    this.deletingAttendanceId.set(assistenciaId);
    this.editFormError.set('');

    this.csopaService.deleteAssistencia(activitat.csopaActivitatId, assistenciaId).subscribe({
      next: updated => {
        this.activitats.update(current =>
          current.map(item => item.csopaActivitatId === updated.csopaActivitatId ? updated : item)
        );
        this.deletingAttendanceId.set(null);
      },
      error: err => {
        this.editFormError.set(err?.error?.message ?? "No s'ha pogut treure l'assistencia.");
        this.deletingAttendanceId.set(null);
      }
    });
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
      this.sortDirection.set(column === 'usuario' ? 'asc' : 'desc');
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

  private confirmActivityDate(tipus: number, fecha: string): boolean {
    const day = new Date(`${fecha}T12:00:00`).getDay();

    if (tipus === CSOPA_TIPUS_SOPAR && day !== 2) {
      return window.confirm("Estas publicant un sopar en una data que no es dimarts. Vols continuar?");
    }

    if (tipus === CSOPA_TIPUS_GYMFRIT && day !== 4) {
      return window.confirm("Estas publicant un Gymfrit en una data que no es dijous. Vols continuar?");
    }

    return true;
  }

  private getTodayInputValue(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
