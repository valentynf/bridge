# Multiplayer Card Game — Build Plan

> The full game rules are documented in GAME_RULES.md. That file is the source of truth for all logic decisions. When in doubt, check there first.

---

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express + Socket.io
- **Database:** PostgreSQL
- **Live game state:** In-memory on the server — Redis if scaling becomes necessary
- **Hosting:** Railway or Render

---

## Guiding principles

- The server is always the source of truth. Clients display state, they don't own it.
- Game logic lives on the server, isolated from transport (WebSocket) and UI (React).
- Each player receives only the information they are allowed to see.
- Build and test logic before building UI.

---

## Phase 0 — Know the game before you build it

Before writing any code, be able to answer all of the following without referring to the rules doc:

- How does dealing work? How many cards does each player end up with, and what happens to the dealer's last card?
- What triggers the dealer's opening play and when is it considered done?
- On a normal turn, what are the conditions for playing vs drawing?
- What does each special card do — 6, 7, 8, Ace, Jack — including multi-card combinations?
- How does the 8s distribution choice work when multiple 8s are played?
- What is the "cover" mechanic for 6s, and why is it different from a regular turn?
- When can a player NOT win even if their hand is empty?
- How is the Jack finish bonus calculated, and what are the two options the winner chooses between?
- What is the order of operations for scoring at the end of a round (raw points → Jack Option B → reshuffle multiplier → cumulative)?
- How does the reshuffle multiplier accumulate across multiple reshuffles in a round?
- When does a reshuffle happen — and when does it not?
- What happens when a player hits exactly 120 points?
- Who deals first, and who deals in subsequent rounds?

**Exit condition:** You can walk through a complete round — deal to final score — entirely from memory, including edge cases.

---

## Phase 1 — Pure game logic, no web, no UI

Write the entire game engine as isolated TypeScript. No Express, no React, no sockets — just functions and classes.

Responsibilities of this module:

**Deck and dealing**

- Represent a 36-card deck (ranks 6–A, 4 suits)
- Shuffle the deck
- Deal 5 cards to each non-dealer player and place the dealer's 5th card face-up as the opening card
- Identify if the dealer has matching-rank cards to play immediately

**Turn logic**

- Determine whether a player has a legal card to play given the last played card (match by rank or suit)
- Validate a card play (correct player, legal card, pairs/triples/quadruples of same rank)
- Handle drawing from the pile when a player cannot play
- Handle the draw pile exhaustion and reshuffle (only triggered when a player needs to draw, not when the last card is taken); increment reshuffle counter

**Special card effects**

- 7: force next player to draw N cards (N = number of 7s played)
- 8: force next player(s) to draw 2 cards each and skip; validate and apply the distribution choice made by the playing player
- Ace: skip next N players (N = number of Aces played)
- Jack: accept a suit declaration; override normal play rules for the next player; validate that the next player plays the declared suit or another Jack
- 6: force the same player to immediately cover; loop drawing until they can cover

**Win condition checking**

- Detect when a player's hand is empty
- Validate the win is legal (Ace-last edge case — check if skips cycle back to the same player)

**Scoring**

- Count point values of remaining cards in each losing player's hand
- Apply Jack Option B multiplier if applicable (winner's choice)
- Apply reshuffle multiplier on top
- Apply Jack Option A to winner's cumulative score if applicable (independently, not affected by reshuffle multiplier)
- Add final totals to cumulative scores
- Check for elimination (over 120), reset (exactly 120), or continuation
- Determine who deals next round (lowest cumulative score; tiebreak: clockwise from winner)

This code must have tests. This is non-negotiable — it is the foundation everything else stands on, and bugs here will haunt every later phase. Specifically write tests for the edge cases: Ace-last win prevention, 6 cover loop, 8s distribution, reshuffle trigger timing, exact-120 reset, and the scoring order of operations.

**Exit condition:** You can simulate a complete round — deal, full turn sequence with special cards, end-of-round scoring — entirely inside a test file. No browser, no server.

---

## Phase 2 — Project structure and server skeleton

Set up a monorepo with two packages: `client` and `server`.

- `client` — Vite + React app
- `server` — Express app

Get them running together in development. The client should proxy API/socket requests to the server so you're not dealing with CORS during development.

Add Socket.io to the server and establish the most basic possible connection: client connects, server logs it, client receives a confirmation event. Nothing game-related yet — just proving the pipe works.

**Exit condition:** Opening the browser triggers a WebSocket connection. You can see the connection logged in both the browser console and the server terminal.

---

## Phase 3 — Design the event contract

Before building rooms or game flow, write out every WebSocket event the game needs. Do this in a document — not in code.

Categorise every event:

**Client → Server** (actions a player takes)

- Examples: `join_room`, `play_cards`, `draw_card`, `declare_suit` (after Jack), `choose_8_distribution`, `choose_jack_bonus`

**Server → Client** (state changes the server broadcasts)

- Examples: `room_joined`, `game_started`, `hand_dealt`, `cards_played`, `draw_forced`, `turn_skipped`, `suit_declared`, `pile_reshuffled`, `round_over`, `game_over`

For each event define:

- Its name
- Direction and audience (broadcast to all players, or emitted to one specific player only)
- The exact shape of the data payload

Hard cases to think through carefully:

- `hand_dealt` — the server sends a different payload to each player (their own cards only)
- `choose_8_distribution` — the playing player must specify targets before the action is confirmed; the server must validate the choice is legal
- `choose_jack_bonus` — only the round winner receives this prompt; other players wait
- `pile_reshuffled` — all players need to know this happened (it affects end-of-round scoring)

**Exit condition:** A written document listing every event, its direction, its audience, and its payload shape. This is the API contract for Phases 4 and 5.

---

## Phase 4 — Rooms and lobby (server-side)

Build the room management system on the server.

- A player can create a room and receive a room code
- Other players can join using that code
- The server tracks which socket belongs to which player and room
- When 4 players are present, the game can be started

Handle disconnections simply for now: if a player drops, pause the game and wait for them to reconnect. Don't try to handle it gracefully yet.

Store room and player state in memory on the server (a Map or plain object). No database in this phase.

**Exit condition:** 4 separate browser tabs can join the same room. The server correctly tracks all 4 connections and knows each player's identity within the room.

---

## Phase 5 — Wire game logic into the server

Bring the Phase 1 game engine into the server and connect it to the Socket.io event layer from Phase 3.

When a game starts:

- Server deals using Phase 1 logic
- Server emits `game_started` to each player — each receives only their own cards, plus `initialEffect` if the face-up card is special
- Turn loop begins: server tracks whose turn it is, accepts `play_cards` or `draw_card` events, validates them, updates game state, broadcasts the result

Special card handling on the server:

- After a Jack is played (and no bridge declared), server emits a `declare_suit` prompt and waits
- After a round winner is detected and they finished with Jacks, server emits a `choose_jack_bonus` prompt and waits before calculating final scores

The server rejects any invalid action and emits an error back to that client only.

### Phase 1 logic updates required

These changes to the existing game engine were identified during Phase 3 (event contract design) and were applied during Phase 5:

1. **Move effects out of `applyPendingEffects` into `playCards` pipeline.** Effects (7s, 8s, Aces) apply immediately after a play, not at the start of the next turn.

2. **Make 6-cover interactive over WebSocket.** The server signals the player that they must cover, then the player draws card-by-card via `draw_card` events until they can cover, then plays the cover via `play_cards`.

3. **Allow post-cover same-rank follow-up.** After a 6 is covered, the player may play additional cards of the same rank as the cover card before ending their turn.

4. **Dealer's opening turn uses different validation.** The dealer can only play cards matching the face-up card's rank (not suit).

5. **Bridge check must happen before Jack suit prompt.** After `cards_played`, bridge is checked first. Bridge with Jacks means no suit declaration and no Jack finish bonus.

**Exit condition:** 4 players can play a complete round through the server, including all special card effects, reshuffle, and correct end-of-round scoring.

### Phase 5 backlog (deferred)

1. **`mockReturnValue(0.1)` fragility** — dealer index selection in tests relies on a specific `Math.random` mock value. Frafile if the formula changes.
2. **Unify dealer turn + regular turn flow** — the `play_cards` handler has two large branches (dealer vs usual) with duplicated effects application code. Extract the shared effects block into a private method.

---

## Phase 6 — Frontend game UI

Build the React interface. A player connects, sees a lobby, joins or creates a room, and is presented with the game table.

The game table displays:

- The player's own hand
- The active pile (last played cards)
- The draw pile (face-down, card count visible)
- Whose turn it is
- Current declared suit (when a Jack has been played)
- Each player's cumulative score
- Reshuffle count for the current round (so players know the multiplier)

Interactive moments the UI must handle:

- Selecting one or more cards of the same rank to play together
- When 8s are played: radio selector for distribution (target 1 player or spread)
- When a Jack is played: suit picker (4 options)
- When a round is won with Jacks: bonus picker (Option A or Option B)

Key discipline: the server is always right. React state reflects what the server says. If the server rejects a play, the UI resets. Never let the client get ahead of the server.

**Exit condition:** 4 players can complete a full round through the browser UI, including all interactive special card moments.

---

## Phase 7 — Authentication and persistence

Add user accounts: register, login, JWT-based sessions.

Store in PostgreSQL:

- Users table
- Completed games (participants, final scores, date)
- Optional: cumulative leaderboard

Authentication comes this late deliberately — it adds friction during active development. Build the game first, gate it second.

**Exit condition:** Players must log in to play. Game results are stored and retrievable.

---

## Phase 8 — Deployment

Deploy to Railway or Render.

- Server + Postgres on the backend
- Client as static files (same host or separate)
- Environment variables configured (DB connection string, JWT secret, etc.)
- WebSockets confirmed working in production (may require specific config)

**Exit condition:** The game is accessible at a public URL. Someone else can play it without running anything locally.

---

## Scope boundaries (do not expand until v1 is complete)

- No AI opponents
- No spectator mode
- No chat
- No mobile-optimised UI
- No game history replay
- No custom rule variants

These are all valid future features. None of them belong in v1.
