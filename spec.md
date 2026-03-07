# Garden Guardians

## Current State
The game has 4 villain types: Chotu (chaos runner), Pari (axe queen with tornado), Pihu (trickster with clones), and Auli (rage spirit with bow and arrows). All villains attack trees individually at close range or via arrows. There is no area-of-effect bomb mechanic.

## Requested Changes (Diff)

### Add
- Two new villain types: `samar` and `nonu` (bomb throwers)
- New `Bomb` entity type: flying projectile that, on impact, destroys up to 10 nearest trees in a blast radius
- Bomb explosion particle effect (orange/red fireball burst) + screen shake
- Floating text "💣 BOOM! -X trees!" on explosion
- Samar and Nonu included in wave spawning rotation
- Bomb entity tracked in GameState (`bombs: Bomb[]`, `bombIdCounter: number`)

### Modify
- `types.ts`: Add `"samar" | "nonu"` to VillainType, add Bomb interface, add `bombs` and `bombIdCounter` to GameState
- `gameLogic.ts`: Add bomb spawn logic in villain update, add updateBombs() function, include Samar/Nonu in createVillain and spawnWave
- `renderer.ts`: Draw bombs as animated lit fuse projectiles, draw explosion flash

### Remove
- Nothing removed
