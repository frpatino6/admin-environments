export interface Team {
  _id?: string;
  slug: string;
  displayName: string;
  environments: string[];
  slackWebhookUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Environment {
  _id?: string;
  name: string;
  team: string;
  shared?: boolean;
  status: 'Libre' | 'Ocupado';
  branch: string | null;
  deployedBy: string | null;
  deployedByTeam?: string | null;
  deployedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeployRequest {
  branch: string;
  deployedBy: string;
}

export type ActivityAction = 'deploy' | 'release';

export interface ActivityLog {
  _id?: string;
  environmentName: string;
  team: string;
  action: ActivityAction;
  branch: string | null;
  performedBy: string;
  releasedBy?: string;
  performedAt?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}
