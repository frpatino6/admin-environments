export interface Environment {
  _id?: string;
  name: string;
  status: 'Libre' | 'Ocupado';
  branch: string | null;
  deployedBy: string | null;
  deployedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeployRequest {
  branch: string;
  deployedBy: string;
}
