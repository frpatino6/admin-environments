import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Team } from '../../models/environment.model';
import { TeamService } from '../../services/team.service';

@Component({
  selector: 'app-team-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-picker.component.html',
})
export class TeamPickerComponent implements OnInit {
  private router = inject(Router);
  private teamService = inject(TeamService);

  teams = signal<Team[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        if (teams.length === 0) {
          this.teamService.initTeams().subscribe({
            next: () => this.loadTeams(),
            error: () => this.loading.set(false)
          });
          return;
        }
        this.teams.set(teams);
        this.loading.set(false);

        const saved = this.teamService.getSavedTeam();
        if (saved && teams.some(t => t.slug === saved)) {
          this.router.navigate(['/teams', saved]);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  private loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => { this.teams.set(teams); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectTeam(team: Team): void {
    this.teamService.saveTeam(team.slug);
    this.router.navigate(['/teams', team.slug]);
  }
}
