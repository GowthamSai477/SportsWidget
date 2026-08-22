# Database

PostgreSQL 16, accessed exclusively via Prisma + migrations. Source: `apps/api/prisma/schema.prisma`.

## Entity map

```
Sport ─┬─< Competition ─┬─< Season ─┬─< Round ─┬─< Event ─┬─< EventParticipant ─< EventResult
       │                │           │          │
       ├─< Team ──┬─────┘           └─ Venue   │
       └─< Player ┘                           └─ Standings (comp+season+type unique)
                                                 └─< StandingEntry

User ─┬─< Device            User ─< Favorite (polymorphic type+targetId)
      ├─< Widget             User ─< Notification / NotificationPreference
      ├─< RefreshToken       User ─< Entitlement / Subscription > SubscriptionPlan

ProviderSource ─┬─< ProviderMapping  (externalId ↔ internalId per entityType)
                └─< SyncJob ─< SyncLog
```

## Conventions

- **UTC everywhere**: `timestamptz` in Postgres; conversion happens client-side.
- **JSONB discipline** (§10): only controlled sport-specific extras — e.g.
  `Event.metadata = { sessionShort, mock }` for F1. Frequently filtered fields
  (`status`, `startTime`, `competitionId`) are always real columns.
- **Provider mapping** (§11): every synced row is reachable from
  `(sourceId, entityType, externalId)`; internal IDs are stable and never exposed.
- **Polymorphic favorites**: `(userId, type, targetId)` unique; FK integrity is
  enforced in the favorites service, not the schema.

## Deliberate deviations from the spec's §9 list

See DECISIONS.md D3: profiles merged into users; `leagues` ≡ `competitions`;
circuits folded into venues; `sports_categories` is a column until it needs attributes.

## Event status vocabulary

`SCHEDULED CONFIRMED LIVE PAUSED FINISHED POSTPONED CANCELLED DELAYED TBC`
Transitions come from providers or time-derivation (`mergeStatus` in sync.service);
terminal states never regress.

## F1 event types

`PRACTICE_1 PRACTICE_2 PRACTICE_3 QUALIFYING SPRINT_QUALIFYING SPRINT RACE`
(short codes FP1..SQ S RACE stored in `Event.metadata.sessionShort`).

## Operations

```bash
npm run db:migrate     # prisma migrate dev (creates/updates local schema)
npm run db:seed        # idempotent seed: sports, competition+season, plans, dev user/widget
npm run db:studio      # Prisma Studio UI
```

Migrations are the only way schema changes reach any database — no manual DDL.
