import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SolarSystemComponent } from './solar-system/solar-system.component';

const routes: Routes = [
  {
    path: '',
    component: SolarSystemComponent
  }
];

@NgModule({
  declarations: [
    SolarSystemComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class SolarSystemModule { }
