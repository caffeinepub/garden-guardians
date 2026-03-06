# Garden Guardians

## Current State

New project. No existing code.

## Requested Changes (Diff)

### Add

- Full 2D Canvas-based game: Garden Guardians
- Living garden with 4 tree types: Normal, Fruit, Flower, Ancient
- Villain system: Chotu (Chaos Runner), Pari (Axe Queen), Pihu (Trickster), Auli (Rage Spirit)
- Auli Rage Meter: fills as trees are destroyed; Beast Mode at full rage
- Bike Rider team: Nishi, Mohini, Gaytri, Meenakshi, Sashi – each with unique skill
- Bike Combo Attack: 3 riders together create shockwave defense
- Brotherhood system: Amit, Ashok, Pankaj, Bharat, Neeraj plant/protect trees; combo abilities when working together
- Subbu (3yr old): water spill = faster tree growth, flower throw = stronger trees; Cry Alarm = all rush to protect
- Dynamic weather engine: Rain, Storm, Sun, Rainbow, Night – each affecting gameplay
- Expanding map with 5 areas unlockable over time
- AI behavior: bike riders patrol/detect/chase; villains target weakest areas
- Victory: grow 100 ancient trees. Failure: ecosystem collapse
- Game score saved to backend (high scores)

### Modify

- None

### Remove

- None

## Implementation Plan

1. Backend: store high scores (player name + score + wave reached)
2. Frontend game loop using Canvas API + requestAnimationFrame
3. Game entities: Tree, Villain, Rider, Brother as TypeScript classes
4. Auli rage meter state, beast mode visual (red glow, screen shake)
5. Weather system cycling through weather states with visual effects
6. AI: riders patrol paths, detect nearest villain, chase; villains target unprotected trees
7. HUD: tree count, rage meter, weather indicator, score, area name
8. Wave-based progression unlocking map areas
9. Start screen, pause, game over screen
10. Persist and display high scores via backend
