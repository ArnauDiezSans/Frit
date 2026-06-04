import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { PendentCompraItem, PendentCompraService } from './pendent-compra.service';

@Component({
  selector: 'app-pendent-compra-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './pendent-compra-page.component.html',
  styleUrl: './pendent-compra-page.component.css'
})
export class PendentCompraPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private pendentCompraService = inject(PendentCompraService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  modalOpen = signal(false);

  items = signal<PendentCompraItem[]>([]);
  selectedIds = signal<number[]>([]);
  selectedCount = computed(() => this.selectedIds().length);

  form = this.fb.group({
    quantitat: [1, [Validators.required, Validators.min(1)]],
    descripcio: ['', [Validators.required, Validators.maxLength(500)]],
    link: ['', Validators.maxLength(1000)]
  });

  ngOnInit(): void {
    this.cargarItems();
  }

  cargarItems(): void {
    this.loading.set(true);
    this.error.set('');

    this.pendentCompraService.getAll().subscribe({
      next: items => {
        this.items.set(items);
        this.selectedIds.set([]);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'ha pogut carregar la llista de compra.");
        this.loading.set(false);
      }
    });
  }

  abrirModal(): void {
    this.form.reset({
      quantitat: 1,
      descripcio: '',
      link: ''
    });
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.formError.set('');
  }

  guardarItem(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revisa els camps obligatoris.');
      return;
    }

    const raw = this.form.getRawValue();

    this.saving.set(true);
    this.formError.set('');
    this.success.set('');

    this.pendentCompraService
      .create({
        quantitat: Number(raw.quantitat ?? 1),
        descripcio: raw.descripcio?.trim() ?? '',
        link: raw.link?.trim() || null
      })
      .subscribe({
        next: item => {
          this.items.update(current => [...current, item]);
          this.saving.set(false);
          this.success.set('Element afegit correctament.');
          this.cerrarModal();
        },
        error: err => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? "No s'ha pogut afegir l'element.");
        }
      });
  }

  toggleSelected(id: number, checked: boolean): void {
    this.selectedIds.update(current => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter(itemId => itemId !== id);
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  limpiarSeleccionados(): void {
    const ids = this.selectedIds();

    if (ids.length === 0 || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.error.set('');

    this.pendentCompraService.deleteSelected(ids).subscribe({
      next: () => {
        this.items.update(current => current.filter(item => !ids.includes(item.pendentCompraId)));
        this.selectedIds.set([]);
        this.deleting.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut netejar els elements seleccionats.");
        this.deleting.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByItemId(_: number, item: PendentCompraItem): number {
    return item.pendentCompraId;
  }
}
