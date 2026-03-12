---
title: Integration with chess-core
description: Use @pech/chess-core for rules and move validation.
---

Use [@pech/chess-core](https://github.com/EduardoPech/chess-core) for legal move generation and game state. In `onMove`, validate the move with the core and call `board.setPosition(game.fen())` (or similar) after applying it; return `false` to reject the move.
