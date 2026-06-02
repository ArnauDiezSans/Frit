import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Juego, UsuarioOption } from './juegos.models';
import { JuegosService } from './juegos.service';
import { UsuariosService } from './usuarios.service';

function minLessOrEqualMaxValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const min = Number(group.get('numeroJugadoresMin')?.value);
    const max = Number(group.get('numeroJugadoresMax')?.value);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }

    return min <= max ? null : { minGreaterThanMax: true };
  };
}

@Component({
  selector: 'app-juegos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './juegos-page.component.html',
  styleUrl: './juegos-page.component.css'
})
export class JuegosPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private juegosService = inject(JuegosService);
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');

  juegos = signal<Juego[]>([]);
  usuarios = signal<UsuarioOption[]>([]);

  userName = computed(() => this.authService.currentUser?.nombre ?? 'Usuario');
  totalJuegos = computed(() => this.juegos().length);

  form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      numeroJugadoresMin: [1, [Validators.required, Validators.min(1)]],
      numeroJugadoresMax: [4, [Validators.required, Validators.min(1)]],
      propietarioId: [0, [Validators.required, Validators.min(1)]],
      tipo: ['', [Validators.maxLength(200)]],
      bggId: [''],
      dificultadBgg: [''],
      pvp: [''],
      fechaAdquisicion: [''],
      juegoBaseId: ['']
    },
    { validators: minLessOrEqualMaxValidator() }
  );

  ngOnInit(): void {
    this.precargarPropietarioActual();
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');

    let juegosCargados = false;
    let usuariosCargados = false;

    this.juegosService.getAll().subscribe({
      next: (juegos) => {
        this.juegos.set(juegos);
        juegosCargados = true;
        this.intentarFinalizarCarga(juegosCargados, usuariosCargados);
      },
      error: () => {
        this.error.set('No se pudieron cargar los juegos.');
        this.loading.set(false);
      }
    });

    this.usuariosService.getAll().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.seleccionarPropietarioPorDefecto(usuarios);
        usuariosCargados = true;
        this.intentarFinalizarCarga(juegosCargados, usuariosCargados);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      }
    });
  }

  private intentarFinalizarCarga(juegosCargados: boolean, usuariosCargados: boolean): void {
    if (juegosCargados && usuariosCargados) {
      this.loading.set(false);
    }
  }

  private precargarPropietarioActual(): void {
    const usuarioId = this.authService.currentUser?.usuarioId ?? 0;
    if (usuarioId > 0) {
      this.form.patchValue({ propietarioId: usuarioId });
    }
  }

  private seleccionarPropietarioPorDefecto(usuarios: UsuarioOption[]): void {
    const currentUserId = this.authService.currentUser?.usuarioId ?? 0;
    const existeUsuarioActual = usuarios.some((u) => u.usuarioId === currentUserId);
    const propietarioActual = this.form.controls.propietarioId.value;

    if (propietarioActual > 0 && usuarios.some((u) => u.usuarioId === propietarioActual)) {
      return;
    }

    if (existeUsuarioActual) {
      this.form.patchValue({ propietarioId: currentUserId });
      return;
    }

    if (usuarios.length > 0) {
      this.form.patchValue({ propietarioId: usuarios[0].usuarioId });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set('');
    this.success.set('');

    const value = this.form.getRawValue();

    this.juegosService.create({
      juegoId: 0,
      nombre: value.nombre.trim(),
      numeroJugadoresMin: Number(value.numeroJugadoresMin),
      numeroJugadoresMax: Number(value.numeroJugadoresMax),
      propietarioId: Number(value.propietarioId),
      tipo: value.tipo.trim(),
      bggId: this.toNullableNumber(value.bggId),
      dificultadBgg: this.toNullableNumber(value.dificultadBgg),
      pvp: this.toNullableNumber(value.pvp),
      fechaAdquisicion: value.fechaAdquisicion?.trim() ? value.fechaAdquisicion : null,
      juegoBaseId: this.toNullableNumber(value.juegoBaseId)
    }).subscribe({
      next: (juego) => {
        this.juegos.set([juego, ...this.juegos()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        this.saving.set(false);
        this.success.set('Juego creado correctamente.');
        this.resetFormManteniendoPropietario();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err.error?.message ?? 'No se pudo crear el juego.');
      }
    });
  }

  private resetFormManteniendoPropietario(): void {
    const propietarioId = this.form.controls.propietarioId.value || this.authService.currentUser?.usuarioId || 0;

    this.form.reset({
      nombre: '',
      numeroJugadoresMin: 1,
      numeroJugadoresMax: 4,
      propietarioId,
      tipo: '',
      bggId: '',
      dificultadBgg: '',
      pvp: '',
      fechaAdquisicion: '',
      juegoBaseId: ''
    });
  }

  private toNullableNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  get nombre() {
    return this.form.controls.nombre;
  }

  get numeroJugadoresMin() {
    return this.form.controls.numeroJugadoresMin;
  }

  get numeroJugadoresMax() {
    return this.form.controls.numeroJugadoresMax;
  }

  get propietarioId() {
    return this.form.controls.propietarioId;
  }

  trackByJuegoId(_: number, juego: Juego): number {
    return juego.juegoId;
  }

  getNombrePropietario(propietarioId: number): string {
    return this.usuarios().find((u) => u.usuarioId === propietarioId)?.nombre ?? `#${propietarioId}`;
  }
}