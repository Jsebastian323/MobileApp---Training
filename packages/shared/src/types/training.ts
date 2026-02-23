// ============================================================
// Training primitive types
// ============================================================

export type RepZone = 'heavy_hypertrophy' | 'standard' | 'metabolic';

export interface RepRange {
  min: number;
  max: number;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type RecoveryTolerance = 'low' | 'moderate' | 'high';

// ============================================================
// Workout template types (defined by the trainer)
// ============================================================

export interface ExerciseTemplate {
  exerciseId: string;
  /** The primary muscle group targeted by this exercise. */
  muscleGroup: import('./index').MuscleGroup;
  /** Trainer's baseline set count (engine may override per week). */
  baseSets: number;
  /** Trainer's preferred rep range (engine may override via zone). */
  repRange: RepRange;
  /** Trainer's default RIR target (engine may override per week). */
  defaultRIR: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  /**
   * Which day of the week this session is scheduled.
   * 0 = Monday, 1 = Tuesday, ..., 6 = Sunday.
   */
  dayIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  exercises: ExerciseTemplate[];
}
