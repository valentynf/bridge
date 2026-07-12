# WebSocket Event Contract

> Phase 3 exit condition met. This document defines every WebSocket event the game uses, its direction, audience, and payload shape. It is the API contract between client and server.

---

## Conventions

- **C→S** = Client sends to Server
- **S→C** = Server sends to Client(s)
- **sender** = only the socket that triggered the event
- **all in room** = every connected socket in that game room
- **each player (unique)** = server sends a different payload to each player

Effects (7s, 8s, Aces) apply **immediately** after `cards_played`, not at the start of the next turn. `turn_started` is lightweight — it only announces whose turn it is.

Other players never see another player's actual cards. They see `handCount` instead.

---

## Lobby & rooms

| Event                 | Dir | Audience    | Payload                    |
| --------------------- | --- | ----------- | -------------------------- |
| `create_room`         | C→S | sender      | `{ playerName }`           |
| `room_created`        | S→C | sender      | `{ roomCode }`             |
| `join_room`           | C→S | sender      | `{ playerName, roomCode }` |
| `room_joined`         | S→C | all in room | `{ lobbyMembers[] }`       |
| `player_ready`        | C→S | sender      | `{ }`                      |
| `player_ready_update` | S→C | all in room | `{ readyPlayers[] }`       |

---

## Game start

| Event          | Dir | Audience    | Payload |
| -------------- | --- | ----------- | ------- |
| `game_started` | S→C | all in room | (none)  |

Signal-only event. Tells clients to switch from lobby view to game view. No payload — all game data comes from `round_started`.

## Round start

| Event           | Dir | Audience             | Payload                                                                                |
| --------------- | --- | -------------------- | -------------------------------------------------------------------------------------- |
| `round_started` | S→C | each player (unique) | `{ players: RoundPlayer[], hand, activePileTopCard, dealerIndex, currentPlayerIndex }` |

Fires at the start of every round (including the first). Each player receives their own `hand`. `players` is the authoritative list of active players: `{ nickname, id, score }[]` — array index is the player index. After eliminations, spliced players are gone and indexes shift.

`currentPlayerIndex` equals `dealerIndex` on the first turn (dealer's special opening play). Effects from the face-up card are calculated and applied after the dealer's opening turn ends, via `effects_applied`.

---

## Gameplay — play & draw

| Event          | Dir | Audience    | Payload                                                                |
| -------------- | --- | ----------- | ---------------------------------------------------------------------- |
| `play_cards`   | C→S | sender      | `{ cardsToPlay: Card[] }`                                              |
| `cards_played` | S→C | all in room | `{ playerId, cardsPlayed, activePileTopCard, handCount }`              |
| `hand_update`  | S→C | sender only | `{ updatedHand }` — reusable for any hand change (play, draw, effects) |
| `draw_card`    | C→S | sender      | `{ }`                                                                  |
| `card_drawn`   | S→C | all in room | `{ playerId, drawPileCount, handCount }`                               |

---

## Gameplay — turn flow

| Event          | Dir | Audience    | Payload                  |
| -------------- | --- | ----------- | ------------------------ |
| `end_turn`     | C→S | sender      | `{ }`                    |
| `turn_started` | S→C | all in room | `{ currentPlayerIndex }` |

---

## Gameplay — effects (applied immediately after cards_played)

| Event             | Dir | Audience    | Payload                                                    |
| ----------------- | --- | ----------- | ---------------------------------------------------------- |
| `effects_applied` | S→C | all in room | `{ specialEffects: SpecialEffect[], affectedPlayerIndex }` |

---

## Gameplay — post-play prompts

### Jack suit declaration

| Event           | Dir | Audience    | Payload                       |
| --------------- | --- | ----------- | ----------------------------- |
| `set_jack_suit` | S→C | sender only | `{ }` — prompt to pick a suit |
| `declare_suit`  | C→S | sender      | `{ suit: Suit }`              |
| `suit_declared` | S→C | all in room | `{ suit }`                    |

### Bridge

Bridge is triggered when the top 4 cards on the active pile are the same rank after a player's play. Bridge check happens **before** Jack suit declaration — if the player declares bridge with Jacks, no suit declaration and no Jack finish bonus. If 7s or 8s trigger bridge, their effects still apply before scoring (effects fire after `cards_played`, before `can_bridge`).

| Event             | Dir | Audience    | Payload                           |
| ----------------- | --- | ----------- | --------------------------------- |
| `can_bridge`      | S→C | sender only | `{ }` — player can declare bridge |
| `declare_bridge`  | C→S | sender      | `{ }`                             |
| `bridge_declared` | S→C | all in room | `{ }`                             |

---

## Reshuffle

| Event             | Dir | Audience    | Payload                                  |
| ----------------- | --- | ----------- | ---------------------------------------- |
| `pile_reshuffled` | S→C | all in room | `{ drawPileCount, reshuffleMultiplier }` |

---

## Round & game end

| Event                | Dir | Audience    | Payload                                                                           |
| -------------------- | --- | ----------- | --------------------------------------------------------------------------------- |
| `score_reset`        | S→C | all in room | `{ playerIndex }` — player hit exactly 120, score reset to 0                      |
| `choose_jack_bonus`  | S→C | winner only | `{ jackCount }`                                                                   |
| `declare_jack_bonus` | C→S | sender      | `{ option: "DOUBLE_ALL" \| "MINUS_20" }`                                          |
| `round_ended`        | S→C | all in room | `{ winnerIndex, scores[], eliminatedIndexes[], jackBonus?, reshuffleMultiplier }` |
| `game_over`          | S→C | all in room | `{ finalScores[], winnerIndex }`                                                  |

---

## Errors

| Event   | Dir | Audience    | Payload              |
| ------- | --- | ----------- | -------------------- |
| `error` | S→C | sender only | `{ message, code? }` |

---

## Event flow examples

### Normal turn

1. `turn_started` → player sees it's their turn
2. Player plays → `play_cards` (C→S)
3. Server validates → `cards_played` (S→C to all)
4. If effects (7s/8s/Aces): `effect_applied` fires immediately
5. If bridge possible: `can_bridge` → player chooses → `declare_bridge` → `bridge_declared` → round ends (skip step 6)
6. If Jack (and no bridge): `set_jack_suit` → `declare_suit` → `suit_declared`
7. Player clicks end → `end_turn` (C→S)
8. Server advances → `turn_started` for next player

### Player can't play

1. `turn_started` → player sees it's their turn
2. Player has no legal card → `draw_card` (C→S)
3. Server sends `card_drawn` (S→C)
4. If drawn card is playable, player can play it or end turn
5. If still can't play → `end_turn` (C→S)
6. Server advances → `turn_started` for next player

### Round ending

1. Player plays their last card(s) → `cards_played` with `handCount: 0`
2. Server checks win validity (can't finish on 6)
3. If winner finished with Jack(s): `choose_jack_bonus` → `declare_jack_bonus`
4. Server calculates scores → `round_ended` (S→C to all, includes `winnerIndex`)
5. If any player hit exactly 120: `score_reset` for each (S→C to all)
6. Server splices eliminated players from the array
7. If players remain: `round_started` (S→C, each player unique — fresh snapshot with updated player list)
8. If only one player left: `game_over`

### First game start

1. All players ready → `game_started` (S→C to all, no payload — switch to game view)
2. `round_started` (S→C, each player unique — full game state snapshot)

---

## Out of scope (v1)

- `choose_8_distribution` / `distribute_8s` — 8s distribution choice deferred to v2
- Reconnection events
- Spectator events
- Chat
