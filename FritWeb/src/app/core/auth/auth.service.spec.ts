import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
  });

  it('updates reactive authentication and admin state', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.isAdmin()).toBeFalse();

    service.currentUser = {
      usuarioId: 1, nombre: 'Usuari', esAdmin: true,
      tenantId: 1, tenantCodi: 'frit14', tenantNom: 'Frit14'
    };

    expect(service.currentUserSignal()?.nombre).toBe('Usuari');
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.isAdmin()).toBeTrue();

    service.currentUser = null;

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.isAdmin()).toBeFalse();
  });

  it('enables all initial features for frit14', () => {
    service.currentUser = {
      usuarioId: 1, nombre: 'Usuari', esAdmin: false,
      tenantId: 1, tenantCodi: 'frit14', tenantNom: 'Frit14'
    };

    expect(service.canUseFeature('laLlista')).toBeTrue();
    expect(service.canUseFeature('assistencia')).toBeTrue();
  });

  it('hides la llista and assistencia for ajjrr26', () => {
    service.currentUser = {
      usuarioId: 2, nombre: 'Kiderak', esAdmin: true,
      tenantId: 3, tenantCodi: 'ajjrr26', tenantNom: 'AJJRR'
    };

    expect(service.canUseFeature('laLlista')).toBeFalse();
    expect(service.canUseFeature('assistencia')).toBeFalse();
  });
});
