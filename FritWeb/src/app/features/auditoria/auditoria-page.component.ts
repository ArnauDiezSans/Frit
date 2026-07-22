import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { AuditEntry, AuditoriaService } from './auditoria.service';

@Component({
  selector: 'app-auditoria-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './auditoria-page.component.html',
  styleUrl: './auditoria-page.component.css'
})
export class AuditoriaPageComponent {
  private fb = inject(FormBuilder);
  private service = inject(AuditoriaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly pageSize = 50;
  items = signal<AuditEntry[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  error = signal('');
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  filters = this.fb.group({
    usuario: [''],
    entidad: [''],
    accion: [''],
    desde: [''],
    hasta: [''],
    texto: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.filters.reset({ usuario: '', entidad: '', accion: '', desde: '', hasta: '', texto: '' });
    this.applyFilters();
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update(value => value - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update(value => value + 1);
      this.load();
    }
  }

  formatJson(value?: string | null): string {
    if (!value) return '—';
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }

  logout(): void {
    this.authService.logout().subscribe({ next: () => this.router.navigateByUrl('/login') });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    const raw = this.filters.getRawValue();
    this.service.get(this.page(), this.pageSize, {
      usuario: raw.usuario?.trim() || undefined,
      entidad: raw.entidad?.trim() || undefined,
      accion: raw.accion || undefined,
      desde: raw.desde ? new Date(`${raw.desde}T00:00:00`).toISOString() : undefined,
      hasta: raw.hasta ? new Date(`${raw.hasta}T23:59:59.999`).toISOString() : undefined,
      texto: raw.texto?.trim() || undefined
    }).subscribe({
      next: result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'ha pogut carregar l'auditoria.");
        this.loading.set(false);
      }
    });
  }
}
