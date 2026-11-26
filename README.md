# Bridge

A real-time multiplayer card game for 2–4 players on a 36-card deck. Play all your
cards to win the round; everyone else scores the points left in their hand. Cross 120
and you're out. Last player standing wins the game.

**[Play it here](https://bridge-game-client.netlify.app/)**

Full rules: [GAME_RULES.md](./GAME_RULES.md) · WebSocket contract: [EVENTS.md](./EVENTS.md)

## Stack

- **Client** — React 19, Vite, TypeScript
- **Server** — Node, Express 5, Socket.io, TypeScript
- **Database** — PostgreSQL via Drizzle ORM
- **Auth** — JWT in httpOnly cookies, bcrypt, zod validation
- **Tests** — Vitest

## Layout

```
client/   React app
server/   Express + Socket.io game server
shared/   Types, constants and validation shared by both
```

## Running locally

Requires Node 22 and Docker.

**Server**

```bash
cd server
npm install
cp .env.example .env        # fill in JWT_SECRET
npm run db:up               # Postgres in Docker
npm run db:migrate
npm run dev
```

**Client**

```bash
cd client
npm install
npm run dev
```

The client needs no environment file — it calls the API and socket on relative paths,
proxied to the server by Vite in development and by Netlify `_redirects` in production.

## Tests

```bash
cd server && npm test
cd client && npm test
```

## Deployment

Client on Netlify, server on Render (Docker), database on Neon.

## Status

In active development. Game logic and multiplayer flow are playable end to end.
Reconnection handling and the security pass come next.
