import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'solar-system',
    loadChildren: () => import('./star-system/solar-system.module')
      .then(m => m.SolarSystemModule)
  },
  {
    path: '',
    redirectTo: 'noether-theorem',
    pathMatch: 'full'
  },
  {
    path: 'noether-theorem',
    loadComponent: () => import('./blog/noether-theorem/noether-theorem.component').then(m => m.NoetherTheoremComponent)
  },
  {
    path: '**',
    redirectTo: 'noether-theorem'
  }
];
