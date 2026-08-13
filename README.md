# HBKCC – Undervisningsportal

HBKCC's fælles portal til undervisningstilbud. Pre Mahaad er det første aktive
tilbud. Portalen håndterer hold, semestre, lektioner, materialer og fravær.

## Roller

| Rolle | Adgang |
| --- | --- |
| Elev | Egne hold, lektioner, materialer og eget fravær |
| Forælder | Tilknyttede børns hold, lektioner, materialer og fravær |
| Underviser | Tildelte hold samt redigering af lektioner, materialer og fravær |
| Administrator | Alle data samt administration af hold og brugerrelationer |

Forældre knyttes til elever gennem `parent_students`. En forældrekonto giver
ikke adgang til elevdata, før en administrator har oprettet relationen.

## Teknologi

- Next.js 16 og React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres og Storage

## Lokal opsætning

Krav: Node.js 20 eller nyere og adgang til projektets Supabase-instans.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Udfyld disse værdier i `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Appen er derefter tilgængelig på `http://localhost:3000`.

## Database og RLS

SQL-migrationerne ligger i `supabase/migrations` og skal anvendes i rækkefølge:

1. `202608060001_add_parent_role.sql` tilføjer forældrerollen og relationen.
2. `202608060002_harden_portal_rls.sql` etablerer det samlede adgangssystem.

Med Supabase CLI forbundet til det korrekte projekt:

```bash
supabase db push
```

Læs migrationerne igennem og tag en databasebackup før første kørsel i
produktion. Hardening-migrationen erstatter policies på portalens egne
`public`-tabeller. Den sletter ikke data og ændrer ikke policies på andre
tabeller eller Storage-buckets.

Efter migrationen bør disse scenarier testes med separate testkonti:

- En elev kan kun se egne elevdata.
- En forælder kan kun se tilknyttede børn.
- En underviser kan kun administrere tildelte hold.
- En administrator kan administrere hele portalen.
- En bruger uden hold eller forældrerelation ser ingen undervisningsdata.

## Tilføj et undervisningstilbud

Tilbud administreres i databasetabellen `offers`. Brugere tilknyttes gennem
`user_offers`, og hvert hold har et `offer_id`. Tilbudslisten vises først efter
login og indeholder kun de tilbud, som brugeren må åbne.

## Kvalitetskontrol

```bash
npm run check
npm run build
```

Produktionsbuild kræver gyldige Supabase-miljøvariabler.

## Centrale mapper

- `src/app` – sider, server actions og API-ruter
- `src/components` – fælles UI-komponenter
- `src/lib` – Supabase-, rolle- og tilbudskonfiguration
- `supabase/migrations` – databaseændringer og sikkerhedsregler
