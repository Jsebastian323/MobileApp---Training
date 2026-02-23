# Hypertrophy Program Generator — Algorithm Documentation

## Overview

The `HypertrophyProgramGeneratorService` is a deterministic, rule-based engine that converts a trainer's workout templates into a complete 4-week hypertrophy block. It requires no AI or ML — every decision is computable from the input parameters.

**Input**: `ProgramGenerationRequest`
**Output**: `ProgramBlock` (exactly 4 weeks: 3 accumulation + 1 deload)

---

## Architecture

```
ProgramGenerationRequest
        │
        ▼
┌─────────────────────────────────────────────────────┐
│         HypertrophyProgramGeneratorService          │
│                                                     │
│  1. analyzeAllMuscleSignals()   ← from recentLogs   │
│  2. generateAllWeeks()                              │
│     ├── buildWeek(1, isDeload=false, weekIndex=0)   │
│     ├── buildWeek(2, isDeload=false, weekIndex=1)   │
│     ├── buildWeek(3, isDeload=false, weekIndex=2)   │
│     └── buildWeek(4, isDeload=true,  weekIndex=3)   │
│         └── clampToMRV() per week                   │
└─────────────────────────────────────────────────────┘
        │
        ▼
     ProgramBlock
```

---

## Volume Calculation

### Step 1 — Resolve Volume Landmarks

For each muscle group, the engine resolves `VolumeLandmarks` from:
1. The caller-supplied `volumeLandmarks` overrides (if present)
2. Default landmarks from `DEFAULT_VOLUME_LANDMARKS[experienceLevel]`

| Metric | Meaning |
|--------|---------|
| **MV**  | Minimum Volume — maintenance threshold (no growth) |
| **MEV** | Minimum Effective Volume — where growth starts |
| **MAV** | Maximum Adaptive Volume — computed as `(MEV + MRV) / 2` |
| **MRV** | Maximum Recoverable Volume — hard ceiling for one mesocycle |

### Step 2 — Weekly Set Targets Per Exercise

```
Week 1: setsTarget = baseSets + priorityBonus + autoBonus
Week 2: setsTarget = baseSets + priorityBonus + 1 * rampPerWeek + autoBonus
Week 3: setsTarget = baseSets + priorityBonus + 2 * rampPerWeek + autoBonus
Week 4: setsTarget = max(1, round(peakSets * 0.6))  // deload
```

Where:
- `baseSets` = trainer's baseline from the `ExerciseTemplate`
- `priorityBonus` = `2` if the muscle is in `clientProfile.priorityMuscles`, else `0`
- `rampPerWeek` = `1` if `recoveryTolerance === 'low'`, else `2`
- `autoBonus` = from autoregulation (see below)

### Step 3 — MRV Clamp (post-generation)

After computing all prescriptions for a week, the engine sums sets per muscle group. If any muscle exceeds its MRV, a proportional scale factor is applied to all exercises targeting that muscle in that week.

```
scalingFactor = MRV / totalWeeklySets (if totalWeeklySets > MRV)
setsTarget = max(1, round(setsTarget * scalingFactor))
```

Deload week is exempt from clamping (already reduced to 60%).

---

## Volume Landmark Defaults

All values are **sets per week**, based on Israetel (2019) *Scientific Principles of Hypertrophy Training*.

### Beginner

| Muscle | MV | MEV | MRV |
|--------|-----|------|------|
| Chest | 4 | 6 | 16 |
| Back | 6 | 8 | 18 |
| Shoulders | 4 | 6 | 18 |
| Biceps | 2 | 4 | 16 |
| Triceps | 2 | 4 | 16 |
| Quads | 4 | 6 | 18 |
| Hamstrings | 2 | 4 | 14 |
| Glutes | 0 | 2 | 12 |
| Calves | 4 | 6 | 14 |
| Abs | 0 | 6 | 16 |

### Intermediate

| Muscle | MV | MEV | MRV |
|--------|-----|------|------|
| Chest | 6 | 8 | 22 |
| Back | 8 | 10 | 25 |
| Shoulders | 6 | 8 | 26 |
| Biceps | 4 | 6 | 26 |
| Triceps | 4 | 6 | 26 |
| Quads | 6 | 8 | 25 |
| Hamstrings | 4 | 6 | 20 |
| Glutes | 0 | 4 | 16 |
| Calves | 6 | 8 | 20 |
| Abs | 0 | 8 | 25 |

### Advanced

| Muscle | MV | MEV | MRV |
|--------|-----|------|------|
| Chest | 8 | 10 | 26 |
| Back | 10 | 12 | 30 |
| Shoulders | 8 | 10 | 30 |
| Biceps | 6 | 10 | 30 |
| Triceps | 6 | 10 | 30 |
| Quads | 8 | 12 | 28 |
| Hamstrings | 6 | 8 | 25 |
| Glutes | 4 | 6 | 20 |
| Calves | 8 | 10 | 24 |
| Abs | 8 | 12 | 30 |

---

## Rep Zone Undulation

Each session is assigned a rep zone based on its index within the week (cycling):

| Session Index `% 3` | Zone | Rep Range | Default RIR |
|---------------------|------|-----------|-------------|
| 0 | `heavy_hypertrophy` | 6–10 | 2 |
| 1 | `standard` | 8–12 | 2 |
| 2 | `metabolic` | 12–20 | 3 |

**Deload week**: all sessions use `standard` zone with `targetRIR = 4`.

### Rationale

Mechanical tension (heavy zone), metabolic stress (metabolic zone), and moderate loads (standard zone) each stimulate different hypertrophy mechanisms. Cycling all three within a week optimizes total stimulus across rep ranges.

---

## Autoregulation

When `recentLogs` are provided, the engine computes a `PerformanceSignal` for each muscle group present in the program.

### Signal Detection

For each muscle group, logs are analyzed as follows:

1. **Average achieved RIR** = mean of all `set.rir` values across recent sessions
2. **Fatigued session count** = number of sessions where `meanRIR < targetRIR - 1`

| Signal | Condition |
|--------|-----------|
| `fatigued` | `fatiguedSessionCount >= 2` |
| `struggling` | `avgMeanRIR < targetRIR` (and not fatigued) |
| `progressing` | `avgMeanRIR > targetRIR + 1` AND `avgReps >= 12` |
| `stable` | everything else |

### Volume Adjustment (autoBonus)

| Signal | `autoBonus` |
|--------|-------------|
| `progressing` | `+1` (extra set above standard ramp) |
| `stable` | `0` |
| `struggling` | `-rampPerWeek` (cancels the ramp, holds volume) |
| `fatigued` | `-(rampPerWeek + 2)` (reduces below baseline) |

Fatigued exercises also receive `deloadFlag = true`.

---

## Deload Week Rules

- Volume: `round(peakWeek3Sets * 0.6)` per exercise (min 1 set)
- Rep zone: always `standard` (8–12 reps)
- `targetRIR`: `baseRIR + 2` (4 for standard zone = 6 total, conservative effort)
- `isDeload = true` on the `WorkoutWeek`
- `deloadFlag = true` on all `ExercisePrescription` objects
- No MRV clamping applied (deload is already below maintenance)

---

## Double Progression Hints

The engine checks the **most recent session** for each exercise and provides a `progressionHint` when:

| Condition | Hint |
|-----------|------|
| `avgReps >= repRange.max` AND `avgRIR >= targetRIR` | `"Ready to progress: increase load or target upper rep range"` |
| `avgReps < repRange.min` AND `avgRIR < targetRIR - 1` | `"Reduce load or lower rep target for better form and RIR control"` |

This implements the **double progression model**: the athlete progresses within the rep range first, then progresses the load when the range is mastered.

---

## Tuning Parameters

### Adjusting Volume per Client

| Parameter | Effect |
|-----------|--------|
| `experienceLevel: 'beginner'` | Starts at lower MEV (~30% less), lower MRV |
| `experienceLevel: 'advanced'` | Higher MEV, higher MRV |
| `recoveryTolerance: 'low'` | Ramp of +1 set/week (conservative) |
| `recoveryTolerance: 'high'` | Ramp of +2 sets/week (aggressive) |
| `priorityMuscles` | +2 sets to baseline for those muscles |
| `volumeLandmarks` | Override any muscle's MV/MEV/MAV/MRV |

### Adjusting Templates

The engine distributes the weekly volume across all templates that include a given muscle. Adding more sessions for a muscle does **not** automatically increase total weekly volume — the per-session sets are computed from `baseSets`, and capped by `MRV` in aggregate.

To increase volume: raise `baseSets` in the template, or add more templates for that muscle.

---

## Limitations and Future Work

| Limitation | Future Resolution |
|------------|-------------------|
| No intra-session fatigue tracking | Add fatigue management (volume distribution priority) |
| Single goal (`hypertrophy`) | Add strength, endurance, and powerbuilding goals |
| No exercise selection logic | Add exercise substitution based on equipment |
| Static rep zone cycling | Allow trainer to override rep zone per template |
| Deload always at 60% | Allow dynamic deload depth based on fatigue level |
| No periodization beyond linear ramp | Add wave loading, step loading, or undulating periodization |

---

## Endpoint

```
POST /programs/generate-preview
Content-Type: application/json

{
  "clientProfile": {
    "experienceLevel": "intermediate",
    "recoveryTolerance": "moderate",
    "priorityMuscles": ["chest", "back"],
    "daysPerWeek": 3
  },
  "goal": "hypertrophy",
  "startDate": "2026-02-24",
  "templates": [
    {
      "id": "push-a",
      "name": "Push A",
      "dayIndex": 0,
      "exercises": [
        {
          "exerciseId": "barbell-bench-press",
          "muscleGroup": "chest",
          "baseSets": 4,
          "repRange": { "min": 8, "max": 12 },
          "defaultRIR": 2
        }
      ]
    }
  ]
}
```

Returns a full `ProgramBlock` JSON with 4 weeks of dated, prescribed workouts.
