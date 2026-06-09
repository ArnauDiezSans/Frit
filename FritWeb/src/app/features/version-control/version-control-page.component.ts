import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { VersionCommit, VersionControl, VersionControlService } from './version-control.service';

@Component({
  selector: 'app-version-control-page',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './version-control-page.component.html',
  styleUrl: './version-control-page.component.css'
})
export class VersionControlPageComponent {
  private authService = inject(AuthService);
  private versionControlService = inject(VersionControlService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  versionControl = signal<VersionControl | null>(null);

  ngOnInit(): void {
    this.loadVersions();
  }

  loadVersions(): void {
    this.loading.set(true);
    this.error.set('');

    this.versionControlService.get().subscribe({
      next: versionControl => {
        this.versionControl.set(versionControl);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(this.getLoadErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByCommitHash(_: number, commit: VersionCommit): string {
    return commit.hash;
  }

  private getLoadErrorMessage(err: any): string {
    if (err?.status === 404) {
      return "No s'ha trobat l'endpoint de versions. Revisa que l'API estigui actualitzada i en marxa.";
    }

    if (err?.status === 0) {
      return "No s'ha pogut connectar amb l'API de versions.";
    }

    return err?.error?.message ?? "No s'ha pogut carregar l'historial de versions.";
  }
}
