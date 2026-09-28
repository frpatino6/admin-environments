import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { EnvironmentCardComponent } from './environment-card.component';
import { EnvironmentService } from '../../services/environment.service';
import { QaService } from '../../services/qa.service';
import { Environment } from '../../models/environment.model';
import { QaRequest } from '../../models/qa.model';

describe('EnvironmentCardComponent', () => {
  let fixture: ComponentFixture<EnvironmentCardComponent>;
  let component: EnvironmentCardComponent;
  let environmentServiceSpy: jasmine.SpyObj<EnvironmentService>;
  let qaServiceSpy: jasmine.SpyObj<QaService>;

  function buildEnvironment(overrides: Partial<Environment> = {}): Environment {
    return {
      name: 'env-1',
      team: 'team-a',
      status: 'Ocupado',
      branch: 'feature/x',
      deployedBy: 'fernando',
      deployedAt: null,
      ...overrides,
    };
  }

  function buildQaRequest(overrides: Partial<QaRequest> = {}): QaRequest {
    return {
      _id: 'qa-1',
      jiraKey: 'ABC-123',
      jiraSummary: 'Some summary',
      jiraUrl: null,
      requesterId: 'requester-1',
      reviewerId: null,
      status: 'pending',
      environmentName: 'env-1',
      team: 'team-a',
      rejections: [],
      assignedAt: new Date('2026-01-01T00:00:00.000Z'),
      lastReminderAt: null,
      acceptedAt: null,
      completedAt: null,
      escalatedCount: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    } as QaRequest;
  }

  async function setup(env: Environment, qaRequests: QaRequest[]): Promise<void> {
    environmentServiceSpy = jasmine.createSpyObj('EnvironmentService', ['getHistory']);
    qaServiceSpy = jasmine.createSpyObj('QaService', ['getRequests']);

    environmentServiceSpy.getHistory.and.returnValue(of([]));
    qaServiceSpy.getRequests.and.returnValue(of(qaRequests));

    await TestBed.configureTestingModule({
      imports: [EnvironmentCardComponent],
      providers: [
        { provide: EnvironmentService, useValue: environmentServiceSpy },
        { provide: QaService, useValue: qaServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EnvironmentCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('env', env);
    fixture.detectChanges();
  }

  it('hides a QA request that predates the current deploy (stale from a previous occupation cycle)', async () => {
    const env = buildEnvironment({
      status: 'Ocupado',
      deployedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const staleRequest = buildQaRequest({
      status: 'approved',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await setup(env, [staleRequest]);

    expect(component.qaRequest()).toBeNull();
    expect(component.qaStatusLabel()).toBeNull();
    expect(component.hasOpenQaRequest()).toBeFalse();
    expect(component.qaButtonLabel()).toBe('Solicitar QA');
  });

  it('shows a QA request created after the current deploy started', async () => {
    const env = buildEnvironment({
      status: 'Ocupado',
      deployedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const currentRequest = buildQaRequest({
      status: 'in_progress',
      createdAt: new Date('2026-01-02T01:00:00.000Z'),
    });

    await setup(env, [currentRequest]);

    expect(component.qaRequest()).toEqual(currentRequest);
    expect(component.qaStatusLabel()).toContain('iniciado');
    expect(component.hasOpenQaRequest()).toBeTrue();
  });

  it('keeps showing historical QA status for a Libre environment (regression guard)', async () => {
    const env = buildEnvironment({
      status: 'Libre',
      deployedAt: null,
    });
    const historicalRequest = buildQaRequest({
      status: 'approved',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await setup(env, [historicalRequest]);

    expect(component.qaRequest()).toEqual(historicalRequest);
  });
});
