import type { MuscleGroup } from './index';

// ============================================================
// Training log types
// ============================================================

export interface SetLog {
  reps: number;
  /** Absolute load in kg or lbs. Optional — bodyweight exercises may omit. */
  load?: number;
  /** Reps In Reserve — how many reps the athlete felt they had left. */
  rir?: number;
}

export interface ExerciseLog {
  exerciseId: string;
  muscleGroup: MuscleGroup;
  /** ISO 8601 date string (e.g. "2026-01-13"). */
  sessionDate: string;
  sets: SetLog[];
}

/**
 * Signal derived from recent performance logs for a given muscle group.
 * Used to drive autoregulation adjustments.
 *
 * - `progressing`: athlete is performing well above target (can increase volume)
 * - `stable`:      performance matches expectation (standard ramp)
 * - `struggling`:  performance below target (hold volume, no ramp)
 * - `fatigued`:    multiple sessions with very low RIR (reduce volume, flag deload)
 */
export type PerformanceSignal = 'progressing' | 'stable' | 'struggling' | 'fatigued';
