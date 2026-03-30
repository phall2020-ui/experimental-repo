# Repo Consolidation Kit

This folder contains a deterministic, non-destructive migration kit to consolidate your local repos from 8 to 3.

## Target state

1. `solar-platform` (new monorepo)
   - imports:
     - `/Users/peterhall/Documents/GitHub/Unified app`
     - `/Users/peterhall/Documents/GitHub/Unified app/Monthly reporting`
     - `/Users/peterhall/Documents/GitHub/Unified app/Solar Toolkit`
     - `/Users/peterhall/Documents/GitHub/inverter-data-juggle`
     - `/Users/peterhall/Documents/GitHub/Inverter-daily-checks`
2. `Tickets` remains standalone
3. `Fitness-app` + `Polymarket-spike-bot-v1` move to a separate "labs" org/repo set or archive

## Why this layout

- Keeps runtime-compatible paths for Unified app (`Monthly reporting`, `Solar Toolkit`) while consolidating history.
- Avoids immediate code refactors during migration.
- Gives you one operational solar repo with room for follow-up cleanup.

## Source pinning (captured on 2026-02-14)

- Fitness-app: `2e1b5c460a5c1669eb25041d26a3d6b6160f55a0`
- Inverter-daily-checks: `404141aeed70f8c9a041ca4d8b68d96af4d700e2`
- Polymarket-spike-bot-v1: `a2063a5777890dabae580fce73f9279ab9a6b274`
- Tickets: `2bbe9149377c3d81c862b65641b98f27cd5ba87e`
- Unified app: `80b922f03fce41d6128e485dcb3bf8167546452f`
- Monthly reporting: `ac0f0c8112bf2412f7ce5126938a55691f8c4e34`
- Solar Toolkit: `60f6efb3dae32edc826e4f574241a48691b87adb`
- inverter-data-juggle: `05931c31cd9bab737fc5d3c4589a769db79e975a`

## Execute

1. Preflight (dirty state + gitlink checks):

```bash
bash /Users/peterhall/Documents/GitHub/_consolidation/scripts/01_preflight.sh
```

2. Build consolidated `solar-platform` repo:

```bash
bash /Users/peterhall/Documents/GitHub/_consolidation/scripts/02_build_solar_platform.sh
```

3. Run post-migration checks:

```bash
bash /Users/peterhall/Documents/GitHub/_consolidation/scripts/03_post_migration_checks.sh
```

## Notes

- Existing repos are not modified by this kit.
- Uncommitted changes in source repos are **not** included in history import (imports use current `main` HEAD commits).
- After validation, archive old solar repos as read-only.
