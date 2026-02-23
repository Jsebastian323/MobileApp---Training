# MobileApp---Training

## Project Type
SaaS B2B hypertrophy training platform for commercial gym coaches.

## Phase 1 Scope
- Hypertrophy only
- 4-week blocks (3 accumulation + 1 deload)
- Volume landmarks (MV, MEV, MAV, MRV)
- Double progression model
- Autoregulation via reps and RIR

## Architecture Plan
Monorepo:
- /apps/mobile (Expo + React Native + TypeScript)
- /apps/api (NestJS + TypeScript)
- /packages/shared (shared types and validation)

## Roles
- org_owner
- trainer
- client

## Core Engine
HypertrophyProgramGenerator
- Weekly muscle volume adjustment
- Per-exercise progression
- Deload automation

## Rules
- Strict TypeScript
- Clean architecture
- Multi-tenant SaaS
- No AI in Phase 1 (rule-based engine only)
- Exercise technique explained only through video (<=20 seconds)
