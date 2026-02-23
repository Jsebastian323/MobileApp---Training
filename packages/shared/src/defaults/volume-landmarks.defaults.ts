import type { MuscleGroup, VolumeLandmarks } from '../types/index';
import type { ExperienceLevel } from '../types/training';

// ============================================================
// Default volume landmarks per muscle group, per experience level
//
// Sources:
//   - Israetel, M., Hoffmann, J., & Case, C. (2019). Scientific Principles
//     of Hypertrophy Training. Renaissance Periodization.
//   - RP Hypertrophy App volume recommendations (2021–2024).
//
// Notes:
//   - All values are sets per week.
//   - MAV is not stored — compute as Math.floor((MEV + MRV) / 2) when needed.
//   - MV = Minimum Volume (maintenance; no growth).
//   - MEV = Minimum Effective Volume (growth begins here).
//   - MRV = Maximum Recoverable Volume (hard ceiling for one mesocycle).
// ============================================================

type MuscleLandmarks = Record<MuscleGroup, VolumeLandmarks>;

const BEGINNER: MuscleLandmarks = {
  chest:       { MV: 4,  MEV: 6,  MAV: 10, MRV: 16 },
  back:        { MV: 6,  MEV: 8,  MAV: 12, MRV: 18 },
  shoulders:   { MV: 4,  MEV: 6,  MAV: 10, MRV: 18 },
  biceps:      { MV: 2,  MEV: 4,  MAV: 9,  MRV: 16 },
  triceps:     { MV: 2,  MEV: 4,  MAV: 9,  MRV: 16 },
  quads:       { MV: 4,  MEV: 6,  MAV: 10, MRV: 18 },
  hamstrings:  { MV: 2,  MEV: 4,  MAV: 8,  MRV: 14 },
  glutes:      { MV: 0,  MEV: 2,  MAV: 6,  MRV: 12 },
  calves:      { MV: 4,  MEV: 6,  MAV: 10, MRV: 14 },
  abs:         { MV: 0,  MEV: 6,  MAV: 10, MRV: 16 },
};

const INTERMEDIATE: MuscleLandmarks = {
  chest:       { MV: 6,  MEV: 8,  MAV: 14, MRV: 22 },
  back:        { MV: 8,  MEV: 10, MAV: 16, MRV: 25 },
  shoulders:   { MV: 6,  MEV: 8,  MAV: 14, MRV: 26 },
  biceps:      { MV: 4,  MEV: 6,  MAV: 14, MRV: 26 },
  triceps:     { MV: 4,  MEV: 6,  MAV: 14, MRV: 26 },
  quads:       { MV: 6,  MEV: 8,  MAV: 14, MRV: 25 },
  hamstrings:  { MV: 4,  MEV: 6,  MAV: 12, MRV: 20 },
  glutes:      { MV: 0,  MEV: 4,  MAV: 10, MRV: 16 },
  calves:      { MV: 6,  MEV: 8,  MAV: 14, MRV: 20 },
  abs:         { MV: 0,  MEV: 8,  MAV: 14, MRV: 25 },
};

const ADVANCED: MuscleLandmarks = {
  chest:       { MV: 8,  MEV: 10, MAV: 18, MRV: 26 },
  back:        { MV: 10, MEV: 12, MAV: 20, MRV: 30 },
  shoulders:   { MV: 8,  MEV: 10, MAV: 18, MRV: 30 },
  biceps:      { MV: 6,  MEV: 10, MAV: 18, MRV: 30 },
  triceps:     { MV: 6,  MEV: 10, MAV: 18, MRV: 30 },
  quads:       { MV: 8,  MEV: 12, MAV: 18, MRV: 28 },
  hamstrings:  { MV: 6,  MEV: 8,  MAV: 14, MRV: 25 },
  glutes:      { MV: 4,  MEV: 6,  MAV: 12, MRV: 20 },
  calves:      { MV: 8,  MEV: 10, MAV: 16, MRV: 24 },
  abs:         { MV: 8,  MEV: 12, MAV: 18, MRV: 30 },
};

export const DEFAULT_VOLUME_LANDMARKS: Record<ExperienceLevel, MuscleLandmarks> = {
  beginner: BEGINNER,
  intermediate: INTERMEDIATE,
  advanced: ADVANCED,
};

/**
 * Returns the VolumeLandmarks for a given muscle and experience level,
 * optionally overridden by caller-supplied landmarks.
 */
export function resolveVolumeLandmarks(
  muscle: MuscleGroup,
  experienceLevel: ExperienceLevel,
  overrides?: Partial<Record<MuscleGroup, VolumeLandmarks>>,
): VolumeLandmarks {
  const override = overrides?.[muscle];
  if (override !== undefined) return override;
  const defaults = DEFAULT_VOLUME_LANDMARKS[experienceLevel];
  const landmark = defaults[muscle];
  return landmark;
}
