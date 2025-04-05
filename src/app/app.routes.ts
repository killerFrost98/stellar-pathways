import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'solar-system',
    loadChildren: () => import('./star-system/solar-system.module')
      .then(m => m.SolarSystemModule)
  },
  {
    path: 'blog',
    loadComponent: () => import('./blog/blog.component').then(m => m.BlogComponent)
  },
  {
    path: '**',
    redirectTo: 'solar-system'
  }
];
