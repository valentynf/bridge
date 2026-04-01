# Bridge — Multiplayer Web Game: Build Plan

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express + Socket.io
- **Database:** PostgreSQL
- **Live game state:** In-memory (server) — Redis if scaling becomes necessary
- **Hosting:** Railway or Render

---

## Guiding principles

- The server is always the source of truth. Clients display state, they don't own it.
- Game logic lives on the server, isolated from transport (WebSocket) and UI (React).
- Each player receives only the information they are allowed to see.
- Build and test logic before building UI.

---

## Phase 0 — Know the game before you build it

Before writing any code, be able to answer the following without looking them up:

- How does the bidding sequence work? (suits, levels, doubles, redoubles, passes)
- How is the declarer determined? What is dummy?
- How does trick-taking work? (lead, must follow suit, trump, winning conditions)
- How is score calculated? (part score, game, rubber, overtricks, undertricks, vulnerability)

If any of these are fuzzy, get them clear first. Modeling something you don't fully understand produces bad architecture.

**Exit condition:** You can describe a complete round of Bridge — deal to final score — without referring to any notes.

---

## Phase 1 — Pure game logic, no web, no UI

Write the entire game brain as isolated TypeScript. No Express, no React, no sockets — just functions and classes.

Responsibilities of this module:

- Represent a deck of 52 cards (suit + rank)
- Shuffle and deal 4 hands of 13 cards
- Validate a bid given the current bidding sequence
- Determine when bidding is over and who the declarer is
- Validate a card play (correct player, must follow suit if possible)
- Determine who wins a trick
- Determine when the hand is over (13 tricks played)
- Calculate the score for a completed hand

This code must have tests. This is non-negotiable — it is the foundation everything else stands on, and bugs here will haunt every later phase.

**Exit condition:** You can simulate a complete game — deal, full bidding sequence, all 13 tricks, final score — entirely inside a test file. No browser, no server.

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

Before building rooms or game flow, write out every WebSocket event the game needs. Do this in plain text or a document — not in code.

Categorise every event:

**Client → Server** (actions a player takes)
- Examples: `join_room`, `place_bid`, `play_card`, `pass`

**Server → Client** (state changes the server broadcasts)
- Examples: `room_joined`, `game_started`, `hand_dealt`, `bid_placed`, `trick_resolved`, `game_over`

For each event, define:
- Its name
- Who sends it / who receives it (all players? one specific player?)
- The exact shape of the data payload

The hardest design question here is `hand_dealt` — the server must send a different payload to each of the 4 players. Think carefully about what each player is and isn't allowed to see at each phase.

**Exit condition:** A written document listing every event, its direction, its audience, and its payload shape. This becomes your API contract for Phases 4 and 5.

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

Bring the Phase 1 game logic into the server and connect it to the Socket.io event layer from Phase 3.

When a game starts:
- Server deals 4 hands using Phase 1 logic
- Server emits `hand_dealt` to each player — each receives only their own 13 cards
- Bidding begins; server accepts `place_bid` events, validates them, updates state, broadcasts result to all players
- Card play follows the same pattern: receive, validate, update, broadcast

The server should reject any invalid action (wrong player's turn, illegal bid, illegal card play) and emit an error back to that client only.

**This is the hardest phase.** Expect bugs in the game logic here — that is what the Phase 1 tests are for.

**Exit condition:** 4 players can play a complete game of Bridge through the server. The full flow — deal, bidding, 13 tricks, score — works correctly.

---

## Phase 6 — Frontend game UI

Build the React interface. A player connects, sees a lobby, joins or creates a room, and is presented with a game table.

The game table displays:
- The player's own hand
- The bidding sequence
- Cards played in the current trick
- Whose turn it is

The frontend receives server events and updates what it shows. It sends user actions (bids, card plays) to the server.

Key discipline here: **the server is always right.** React state reflects what the server says — not what the client optimistically guesses. If the server says a bid was invalid, the UI resets. Never let the client get ahead of the server.

**Exit condition:** 4 players can complete a full game through the browser UI.

---

## Phase 7 — Authentication and persistence

Add user accounts: register, login, JWT-based sessions.

Store in PostgreSQL:
- Users table
- Completed games (who played, final score, date)
- Optional: leaderboard / ELO rating

Authentication comes this late deliberately — it adds friction during active development of game flow. Build the game first, gate it second.

**Exit condition:** Players must log in to play. Game results are stored and retrievable.

---

## Phase 8 — Deployment

Deploy to Railway or Render.

- Server + Postgres on the backend
- Client as static files (can be same host or separate)
- Environment variables configured (DB connection string, JWT secret, etc.)
- WebSockets confirmed working in production (may require specific config)

**Exit condition:** The game is accessible at a public URL. Someone else can play it without running anything locally.

---

## Scope boundaries (do not expand until v1 is complete)

- No AI opponents
- No Bridge conventions (Stayman, Blackwood, etc.) — standard bidding only
- No spectator mode
- No chat
- No mobile-optimised UI

These are all valid future features. None of them belong in v1.
