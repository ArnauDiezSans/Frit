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
  editingItemId = signal<number | null>(null);

  items = signal<PendentCompraItem[]>([]);
  highlightedItemId = signal<number | null>(null);
  selectedIds = signal<number[]>([]);
  selectedCount = computed(() => this.selectedIds().length);
  allSelected = computed(() => this.items().length > 0 && this.selectedCount() === this.items().length);
  someSelected = computed(() => this.selectedCount() > 0 && !this.allSelected());

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
    this.editingItemId.set(null);
    this.modalOpen.set(true);
  }

  editarItem(item: PendentCompraItem): void {
    this.form.reset({
      quantitat: item.quantitat,
      descripcio: item.descripcio,
      link: item.link ?? ''
    });
    this.formError.set('');
    this.success.set('');
    this.editingItemId.set(item.pendentCompraId);
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

    const payload = {
      quantitat: Number(raw.quantitat ?? 1),
      descripcio: raw.descripcio?.trim() ?? '',
      link: raw.link?.trim() || null
    };
    const editingId = this.editingItemId();
    const request = editingId
      ? this.pendentCompraService.update(editingId, payload)
      : this.pendentCompraService.create(payload);

    request
      .subscribe({
        next: item => {
          this.items.update(current =>
            editingId
              ? current.map(currentItem => currentItem.pendentCompraId === editingId ? item : currentItem)
              : [...current, item]
          );
          this.highlightedItemId.set(item.pendentCompraId);
          window.setTimeout(() => this.highlightedItemId.set(null), 2500);
          this.saving.set(false);
          this.success.set(editingId ? 'Element actualitzat correctament.' : 'Element afegit correctament.');
          this.cerrarModal();
        },
        error: err => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? "No s'ha pogut afegir l'element.");
        }
      });
  }

  eliminarItem(item: PendentCompraItem): void {
    if (!window.confirm(`Eliminar "${item.descripcio}"?`)) {
      return;
    }

    this.pendentCompraService.delete(item.pendentCompraId).subscribe({
      next: () => {
        this.items.update(current => current.filter(currentItem => currentItem.pendentCompraId !== item.pendentCompraId));
        this.selectedIds.update(current => current.filter(id => id !== item.pendentCompraId));
      },
      error: () => {
        this.error.set("No s'ha pogut eliminar l'element.");
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

  toggleAll(checked: boolean): void {
    this.selectedIds.set(checked ? this.items().map(item => item.pendentCompraId) : []);
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

  formatLink(link: string): string {
    const trimmed = link.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
}
