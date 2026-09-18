import { Routes } from '@angular/router';
import { TeamPickerComponent } from './components/team-picker/team-picker.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { QaDashboardComponent } from './components/qa-dashboard/qa-dashboard.component';
import { QaRejectPageComponent } from './components/qa-reject-page/qa-reject-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
  { path: 'teams', component: TeamPickerComponent },
  { path: 'teams/:slug', component: DashboardComponent },
  { path: 'teams/:slug/qa', component: QaDashboardComponent },
  // QaMember rosters are per-team now, so the QA queue/member-management
  // page requires a team in the URL — the old global /qa page can no
  // longer show a meaningful "everyone" roster. Redirect to team
  // selection instead of 404ing any old bookmarks/links.
  { path: 'qa', redirectTo: 'teams', pathMatch: 'full' },
  // Reached via the "Rechazar" button in Slack notifications — not
  // team-scoped in the URL; the request's team resolves server-side from
  // the stored QaRequest document, so this route is unaffected.
  { path: 'qa/requests/:id/reject', component: QaRejectPageComponent },
  { path: '**', redirectTo: 'teams' }
];
