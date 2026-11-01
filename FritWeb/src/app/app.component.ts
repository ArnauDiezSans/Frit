import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BrandingService } from './core/branding/branding.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly branding = inject(BrandingService);
  detailDialog = signal<{ title: string; entries: { label: string; value: string }[] } | null>(null);

  constructor() {
    this.branding.applyFromUrl(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => this.branding.applyFromUrl(event.urlAfterRedirects));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const row = target?.closest<HTMLElement>('tr[data-detail-row]');
    if (!row || target?.closest('button, a, input, select, textarea, label, summary, details')) {
      return;
    }

    this.openRowDetail(row);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDetailDialog();
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('tr[data-detail-row]');
    if (!row) {
      return;
    }

    event.preventDefault();
    this.openRowDetail(row);
  }

  closeDetailDialog(): void {
    this.detailDialog.set(null);
  }

  private openRowDetail(row: HTMLElement): void {
    const cells = Array.from(row.querySelectorAll<HTMLElement>(':scope > th, :scope > td'));
    const headers = Array.from(row.closest('table')?.querySelectorAll<HTMLTableCellElement>('thead tr:last-child > th') ?? []);
    const entries = cells
      .map((cell, index) => ({
        label: cell.dataset['label'] || headers[index]?.innerText.trim() || '',
        value: cell.innerText.trim()
      }))
      .filter(entry => entry.label && entry.label !== '#' && entry.value && entry.label !== 'Accions' && entry.label !== 'Seleccionar');

    const title = row.dataset['detailTitle'] || entries[0]?.value || 'Detall';
    this.detailDialog.set({
      title,
      entries: entries.filter(entry => entry.value !== title)
    });
  }
}
