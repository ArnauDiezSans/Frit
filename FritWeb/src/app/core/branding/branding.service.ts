import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export type BrandCode = 'frit' | 'ajjrr';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'frit_brand';

  currentBrand(): BrandCode {
    return sessionStorage.getItem(this.storageKey) === 'ajjrr' ? 'ajjrr' : 'frit';
  }

  applyFromUrl(url: string): void {
    if (url === '/ajjrr' || url.startsWith('/ajjrr/')) {
      sessionStorage.setItem(this.storageKey, 'ajjrr');
    } else if (url === '/login' || url === '/register') {
      sessionStorage.removeItem(this.storageKey);
    }

    this.apply(this.currentBrand());
  }

  private apply(brand: BrandCode): void {
    const isAjjrr = brand === 'ajjrr';
    this.document.title = isAjjrr ? 'AJJRR' : 'Frit';

    let favicon = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = this.document.createElement('link');
      favicon.rel = 'icon';
      this.document.head.appendChild(favicon);
    }

    favicon.href = isAjjrr ? '/assets/brands/ajjrr/favicon.png' : '/favicon.ico';
  }
}
