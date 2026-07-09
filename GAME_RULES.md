# Game Rules Reference

> This document is the authoritative source of truth for the game logic implementation.
> Every rule here must be translatable into code. Where ambiguity exists, it is flagged explicitly.

---

## Overview

A card game for 2–4 players, played with a 36-card deck. Players try to get rid of all their cards. Those left holding cards count up their points. Surpass 120 points and you're eliminated. Last player standing wins.

**Player count:** Minimum 2, maximum 4. The game plays best with 4.

---

## The Deck

36 cards: ranks **6, 7, 8, 9, 10, J, Q, K, A** across 4 suits (spades, hearts, diamonds, clubs).

No 2s, 3s, 4s, or 5s.

---

## Point Values

| Cards           | Points  |
| --------------- | ------- |
| 6, 7, 8, 9      | 0       |
| 10, Queen, King | 10 each |
| Ace             | 15      |
| Jack            | 20      |

---

## Dealing

**First round:** The first dealer is chosen randomly.

**Subsequent rounds:** The player with the lowest cumulative score deals. If multiple players share the lowest score, the player sitting clockwise after the round winner deals.

**Process:**

1. Dealer deals cards one at a time, going clockwise, starting with the player to their left.
2. This continues for 5 rounds of dealing.
3. After round 5: each non-dealer has 5 cards. The dealer's own 5th card is placed face-up — this becomes the **first active card** on the table. The remaining undealt cards are stacked face-down next to it. This stack is the **draw pile**.
4. Dealer's opening turn:
    - If the dealer holds any cards of the **same rank** as the face-up card (rank only — not suit), they **may** play one or more of them on top of it. The dealer chooses how many matching-rank cards to play.
    - If the dealer has no matching rank card, their turn is considered done.
5. If the face-up card (or the last card the dealer played on top of it) is a special card, its effect triggers immediately on the first player: a 7 means they draw, an 8 means they draw and skip, an Ace means they skip. If the face-up card is a 6, the dealer must cover it (same rules as the 6 cover mechanic).
6. Regular play begins from the player to the dealer's left.

---

## Core Turn Structure

On your turn:

1. Look at the **last card played** on the active pile. Note its **rank** and **suit**.
2. If you hold a card matching either the **rank** or the **suit** of the last played card — you **must** play. The first card you play must legally match the top card by rank or suit. If you have additional cards of the **same rank** as the card you just played, you may stack them on top in the same action — even if those extra cards don't match the original top card's suit.
3. If you have no playable card — draw one card from the draw pile and try again.
4. If you still cannot play after drawing — your turn ends.
5. Play passes clockwise to the next player.

**You must play at least one card if you can. You cannot skip playing entirely when you hold a legal card.** However, if you hold multiple cards of the same rank, you choose how many to play — you are not forced to play all of them.

---

## Special Cards

These rules trigger based on what the **previous player** just played. They apply before the affected player takes their normal turn.

### 7 — Draw card(s)

- The next player must draw **1 card from the pile per 7 played**.
- If the previous player played two 7s simultaneously, the next player draws 2 cards.
- After drawing, the affected player's turn proceeds normally.

### 8 — Draw and skip

- The next player must draw **2 cards per 8 played** and their turn is **skipped**.
- If multiple 8s were played simultaneously, the playing player decides how to distribute the effect across the following players **in clockwise order** (no skipping):
    - All 8s can be aimed at the next player (they draw 2× the number of 8s and skip once).
    - The effect can be spread across the next N players clockwise (each draws 2 cards and skips their turn).
    - **Example:** 2 eights played → either the next player draws 4 and skips, or the next 2 players in clockwise order each draw 2 and skip.

> **UI rule:** Before confirming the play, the player is shown a radio selector: target 1 player (all effects stacked) or spread across the next N players clockwise. Selection must be made before the action is submitted to the server.

### Ace — Skip turn

- The next player **skips their turn**. They do not draw.
- Multiple aces played simultaneously skip multiple consecutive players.
- **Example:** 2 aces played → the next 2 players in order each skip their turn.

### Jack — Set the suit

- When a Jack is played, the player who played it **declares a suit**. The next player must play a card of that suit — or another Jack.
- A Jack can be played **over any card**, regardless of what was last played (suit or rank).
- Multiple Jacks can be played at once. The last Jack played sets the suit.

> ⚠️ **Implementation note:** Jack overrides the normal "must match rank or suit" rule entirely. It is a wildcard for entry but imposes a suit constraint on the next player.

### 6 — Must cover immediately

- The player who just played the 6 (or multiple 6s) must **immediately play another non-6 card on top** to "cover" it.
- The covering card must match the suit or rank of the top 6 (standard matching rules apply), but **cannot be another 6**.
- If the player cannot cover — they draw cards from the pile **one at a time** until they draw a card they can legally play as a cover, then play it.
- Multiple 6s played at once still require only one cover card (covering the last 6).
- A player **cannot finish the round by playing a 6**. Since the 6 must be covered, playing a 6 as your last card forces you to draw.

> **Implementation note:** The 6 does not end the player's turn — it forces an additional mandatory action within the same turn. This creates a mini-loop: play 6 → must cover with non-6 → if can't, draw until can cover → cover → turn ends.
>
> **Post-play note:** After a 6-cover is resolved (especially when the cover card was drawn from the pile), the player may hold additional cards of the same rank as the cover card. They should be given the opportunity to play those on top. This is handled outside of `playCards`, as a post-play action.

---

## Endgame Rules — Cards you cannot finish on

A player **cannot finish on a 6**, because the 6 must be covered (see Special Cards section above). If a 6 is the player's last card, they are forced to draw.

> **Implementation note:** Before declaring a player the winner, the engine must check: was the last card a 6 that requires covering? If true, the win is invalid and the player draws.

> **Deferred to v2 (toggle):** Ace-last-card edge case — a player cannot win by playing Ace(s) if the skip cycles back to them. Not enforced in v1.

---

## Winning a Round

There are two ways to win a round:

### 1. Empty your hand

The first player to play all their cards wins the round and scores **0 points** for that round.

### 2. Bridge — play all 4 cards of the same rank

If a player plays all 4 cards of the same rank in a single action, they **may** call **"Bridge"**. This is optional — the player can choose to continue playing instead. If Bridge is called, the round ends immediately. **Every player — including the one who called Bridge — counts the points remaining in their hand.** No further cards are played.

This can happen mid-turn: if the top card allows it and the player holds all 4 of a rank, they play all 4, declare Bridge, and the round is over.

**Special card effects on Bridge:**

| Rank | Effect triggers?                                   |
| ---- | -------------------------------------------------- |
| 7    | Yes — next player draws cards before scoring       |
| 8    | Yes — targeted player(s) draw cards before scoring |
| Jack | No — no suit declaration, no finish bonus          |
| 6    | No — no cover required                             |
| Ace  | No — no skips                                      |

### Jack finish bonus

If the winning player's **last card(s) were Jack(s)**, the player chooses one of two options to apply:

- **Option A:** The winner's cumulative score is reduced by **20 × number of Jacks played**.
- **Option B:** Each remaining player's card points for this round are **multiplied by the number of Jacks played**.

The winner picks whichever option benefits them most. Only one option applies per round.

This rule is only valid because players are forced to play cards when they can — you cannot hold Jacks back intentionally to finish with them. The engine enforcing mandatory play is what makes this rule fair.

---

## Scoring a Round

After a player wins the round, all remaining players count the **point values of cards still in their hands** and add that total to their cumulative score.

| Cumulative score | Result                                   |
| ---------------- | ---------------------------------------- |
| Under 120        | Player continues                         |
| Exactly 120      | Score is reset to **0** (not eliminated) |
| Over 120         | Player is **eliminated**                 |

---

## Winning the Game

The game continues across multiple rounds. Players are eliminated when they exceed 120 points. The last player remaining is the winner.

If two or more players cross 120 in the same round, **all of them are eliminated simultaneously**. There is no tie-break on score — both are out.

---

## Draw Pile Exhausted

The pile is **not reshuffled the moment the last card is drawn**. The reshuffle only happens at the moment a player actually needs to draw and finds the pile empty.

When that happens:

1. The **last played card** stays on the table as the active card.
2. All other cards in the discard pile are collected, shuffled, and placed face-down as the new draw pile.
3. The player draws from the new pile as normal.

**Scoring multiplier:** Each reshuffle adds +1 to the round's scoring multiplier.

| Reshuffles | Multiplier  |
| ---------- | ----------- |
| 0          | ×1 (normal) |
| 1          | ×2          |
| 2          | ×3          |
| 3          | ×4          |

The multiplier applies to all players' hand totals at the end of the round before they are added to cumulative scores. The engine must track how many reshuffles have occurred in the current round and reset the counter at the start of each new round.

**Order of operations at end of round:**

1. Each losing player counts raw card points in hand
2. If the winner finished with Jack(s) and chose Option B — apply the Jack multiplier first
3. Then apply the reshuffle multiplier on top of that result
4. Add final total to each player's cumulative score

If the winner chose Jack Option A (subtract from their own score) — that is applied to the winner's cumulative score independently, after step 4, and is not affected by the reshuffle multiplier.

---

## State the Engine Must Track at All Times

- Current dealer
- Current player's turn
- Each player's hand (hidden from other players)
- The active pile (cards played this turn/sequence)
- The draw pile
- The declared suit (when a Jack has been played)
- Each player's cumulative score
- Which players are eliminated
- Active special card effects (pending skips, pending draws)
- Reshuffle count for the current round (resets each round, determines end-of-round scoring multiplier)
