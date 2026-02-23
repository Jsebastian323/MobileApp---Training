// ============================================================
// Roles
// ============================================================
export enum Role {
  OrgOwner = 'org_owner',
  Trainer = 'trainer',
  Client = 'client',
}

// ============================================================
// Base entity
// ============================================================
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Organization (multi-tenant root)
// ============================================================
export interface Organization extends BaseEntity {
  name: string;
  ownerId: string;
}

// ============================================================
// User
// ============================================================
export interface User extends BaseEntity {
  email: string;
  role: Role;
  organizationId: string;
}

// ============================================================
// Volume landmarks (Phase 1 core domain)
// ============================================================
export interface VolumeLandmarks {
  MV: number;   // Minimum Volume — maintenance threshold
  MEV: number;  // Minimum Effective Volume — where growth starts
  MAV: number;  // Maximum Adaptive Volume — optimal range
  MRV: number;  // Maximum Recoverable Volume — hard ceiling
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

// ============================================================
// Exercise
// ============================================================
export interface Exercise extends BaseEntity {
  name: string;
  muscleGroup: MuscleGroup;
  videoUrl: string; // max 20 seconds per project spec
}

// ============================================================
// Training block (Phase 1 — 4 weeks: 3 accumulation + 1 deload)
// ============================================================
export interface TrainingBlock extends BaseEntity {
  clientId: string;
  trainerId: string;
  organizationId: string;
  startDate: Date;
  weekCount: 4;
}
