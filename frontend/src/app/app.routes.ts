import { Routes } from '@angular/router';
import { TeamPickerComponent } from './components/team-picker/team-picker.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
  { path: 'teams', component: TeamPickerComponent },
  { path: 'teams/:slug', component: DashboardComponent },
  { path: '**', redirectTo: 'teams' }
];
