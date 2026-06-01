import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  productName = 'Frit';
  heroTitle = 'Una plataforma moderna para gestionar información y flujos de trabajo';
  heroSubtitle = 'Listo para crecer con tu equipo, manteniendo claridad y ritmo desde el primer día.';
  ctaLabel = 'Empezar ahora';

  
  features = [
    {
      title: 'Trabajo colaborativo',
      description: 'Organiza tareas, documentos y decisiones en una interfaz clara y accesible.',
    },
    {
      title: 'Flujos sencillos',
      description: 'Diseña procesos prácticos que el equipo puede seguir sin fricción.',
    },
    {
      title: 'Crecimiento ordenado',
      description: 'Construye tu solución con una base preparada para evolucionar.',
    },
  ];

  steps = [
    {
      title: 'Define tu espacio',
      description: 'Configura tu tablero y agrega tus primeras secciones en minutos.',
    },
    {
      title: 'Organiza tu trabajo',
      description: 'Clasifica actividades y prioridades con una vista clara.',
    },
    {
      title: 'Activa tu equipo',
      description: 'Comparte el progreso y haz que todos avancen alineados.',
    },
  ];
}
