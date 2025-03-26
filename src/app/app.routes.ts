import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'solar-system',
    loadChildren: () => import('./star-system/solar-system.module')
      .then(m => m.SolarSystemModule)
  },
  {
    path: 'noether-theorem',
    loadComponent: () => import('./blog/noether-theorem/noether-theorem.component').then(m => m.NoetherTheoremComponent)
  },
  {
    path: 'cpu-architecture',
    loadComponent: () => import('./blog/cpu-micro-architecture/cpu-micro-architecture.component').then(m => m.CpuMicroArchitectureComponent)
  },
  {
    path: 'immune-system',
    loadComponent: () => import('./blog/immune-system/immune-system.component').then(m => m.ImmuneSystemComponent)
  },
  {
    path: '**',
    redirectTo: 'solar-system'
  }
];
