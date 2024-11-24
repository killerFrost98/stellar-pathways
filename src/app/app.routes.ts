import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'solar-system',
    loadChildren: () => import('./star-system/solar-system.module')
      .then(m => m.SolarSystemModule)
  },
  {
    path: '',
    redirectTo: 'solar-system',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'solar-system'
  }
];
