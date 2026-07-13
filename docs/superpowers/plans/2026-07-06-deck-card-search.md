# Deck card search (with server-side pagination) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backend-driven search input (matching word + translation + their descriptions) to the deck card-list page and the words table page, replacing today's "fetch every card, do everything client-side" pattern with real server-side search, sort, and pagination — mirroring the existing `/explore` deck-search feature.

**Architecture:** `GET /api/decks/:deckId/cards` changes from a flat array to a paginated `{ items, total, page, pageSize }` response (like `/explore`'s `ExploreResult`), backed by a new Mongo aggregation in `deckCardRepository` that joins `deckcards → cards` and matches a case-insensitive regex across 4 card text fields. A new `GET /api/decks/:deckId/cards/tags` endpoint decouples the tag-filter dropdown from the now-paginated card list. Both frontend pages (card list, words table) adopt the same debounced-search-into-URL pattern `/explore` already uses.

**Tech Stack:** Backend: Node/Express, Mongoose (MongoDB aggregation). Frontend: Next.js 16 App Router, React 19, TypeScript, next-intl.

**Spec:** `docs/superpowers/specs/2026-07-06-deck-card-search-design.md` (this repo).

**No test framework exists in either repo** (no jest/vitest, no `*.test.*` files, no test script in either `package.json`). Per user decision, this plan uses manual verification (curl / browser) instead of automated TDD steps — do not introduce a test framework as part of this work.

## Global Constraints

- Search fields: `front.text`, `back.text`, `front.description`, `back.description` (both card sides, both text + description), combined with `$or`.
- Search (`q`) combines with the existing `tag` filter via AND.
- `q` is capped at 100 chars server-side (same cap as the existing `/explore` search).
- `sort`: `'new'` (addedAt desc) | `'old'` (addedAt asc). Backend defaults to `'old'` when absent/invalid (preserves today's unconditional `{ addedAt: 1 }` order for the card-list page, which sends no `sort`). The words-table page always sends its own default (`'new'`) explicitly.
- `page` defaults to `1`, `pageSize` defaults to `10`, capped at `50` (same caps as `/explore`).
- `q` persists in the URL as `?q=`, independently on each page — same pattern `/explore` already uses (`useSearchParams`/`router.replace`, debounced).
- Empty/whitespace-only `q` behaves exactly like an omitted `q` (full paginated list, as today).
- Regex special characters in `q` must be escaped before building the Mongo regex (reuse the same `escapeRegExp` the existing deck search uses).

---

## Backend tasks (repo: `/Users/egorzozula/Desktop/AnkiBackendCopy`)

### Task 1: Shared search-query validation util

**Files:**
- Create: `src/utils/search.js`
- Modify: `src/repository/deck.js` (remove local `escapeRegExp`, import from util)
- Modify: `src/services/deckService.js` (remove local `parseQuery`/`MAX_QUERY_LENGTH`, use the shared util)

**Interfaces:**
- Produces: `escapeRegExp(value: string): string`, `parseSearchQuery(raw: unknown, maxLength?: number): string`, exported from `src/utils/search.js`. Task 2 and the refactored deck search both depend on these.

- [ ] **Step 1: Create the shared util**

```js
// src/utils/search.js
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseSearchQuery = (raw, maxLength = 100) => {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, maxLength);
};
```

- [ ] **Step 2: Point `src/repository/deck.js` at the shared `escapeRegExp`**

At the top of `src/repository/deck.js`, add the import:

```js
import { escapeRegExp } from '../utils/search.js';
```

Then delete this local definition (currently around line 38):

```js
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

- [ ] **Step 3: Point `src/services/deckService.js` at the shared `parseSearchQuery`**

At the top of `src/services/deckService.js`, add the import:

```js
import { parseSearchQuery } from '../utils/search.js';
```

Delete the local `MAX_QUERY_LENGTH` constant and `parseQuery` function (currently around lines 168 and 184-187):

```js
const MAX_QUERY_LENGTH = 100;
```

```js
const parseQuery = (raw) => {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, MAX_QUERY_LENGTH);
};
```

Inside `exploreDecks`, change:

```js
const q = parseQuery(query?.q);
```

to:

```js
const q = parseSearchQuery(query?.q);
```

- [ ] **Step 4: Manual verification — deck explore search still works**

Start the backend: `cd /Users/egorzozula/Desktop/AnkiBackendCopy && npm run dev`

In another terminal:

```bash
curl -s "http://localhost:9000/api/decks/explore" | head -c 300
curl -s "http://localhost:9000/api/decks/explore?q=a" | head -c 300
```

Expected: both return `200` with a JSON body shaped `{"items":[...],"total":...,"page":1,"pageSize":24,"sort":"new"}` — i.e. behavior identical to before the refactor (this step only moved code, it must not change output).

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiBackendCopy
git add src/utils/search.js src/repository/deck.js src/services/deckService.js
git commit -m "refactor: extract shared search-query validation util"
```

---

### Task 2: Card search + distinct-tags repository methods

**Files:**
- Modify: `src/repository/deckCard.js` (add `searchByDeck`, `countSearchByDeck`, `listDistinctTags`)
- Create (temporary, deleted at end of task): `scripts/manual-verify-card-search.js`

**Interfaces:**
- Consumes: `escapeRegExp` from `src/utils/search.js` (Task 1); existing `buildDeckFilter`, `toObjectId`, `DeckCard` model already in `deckCard.js`.
- Produces: `deckCardRepository.searchByDeck({deckId, tag, q, sort, skip, limit}): Promise<Array<{_id, deck, card, tags, addedAt, cardDoc}>>`, `deckCardRepository.countSearchByDeck({deckId, tag, q}): Promise<number>`, `deckCardRepository.listDistinctTags(deckId): Promise<string[]>`. Task 3 depends on all three.

- [ ] **Step 1: Add the aggregation methods to `src/repository/deckCard.js`**

Add this import at the top of the file (alongside the existing `mongoose`/`DeckCard` imports):

```js
import { escapeRegExp } from '../utils/search.js';
```

Append this to the end of `src/repository/deckCard.js` (after the existing `deleteManyByCard` function):

```js
const CARD_SEARCH_FIELDS = ['front.text', 'back.text', 'front.description', 'back.description'];

// q arrives already trimmed/capped by cardService — this only guards emptiness.
const buildCardTextMatch = (q) => {
  if (typeof q !== 'string' || q.length === 0) return null;
  const regex = new RegExp(escapeRegExp(q), 'i');
  return { $or: CARD_SEARCH_FIELDS.map((field) => ({ [`cardDoc.${field}`]: regex })) };
};

const SEARCH_SORT_STAGES = {
  new: { addedAt: -1, _id: -1 },
  old: { addedAt: 1, _id: 1 },
};

const buildSearchPipeline = ({ deckId, tag, q }) => {
  const match = buildDeckFilter({ deckId, tag });
  const textMatch = buildCardTextMatch(q);
  return [
    { $match: match },
    { $lookup: { from: 'cards', localField: 'card', foreignField: '_id', as: 'cardDoc' } },
    { $unwind: '$cardDoc' },
    ...(textMatch ? [{ $match: textMatch }] : []),
  ];
};

export async function searchByDeck({ deckId, tag, q, sort, skip, limit }) {
  const pipeline = [
    ...buildSearchPipeline({ deckId, tag, q }),
    { $sort: SEARCH_SORT_STAGES[sort] ?? SEARCH_SORT_STAGES.old },
    { $skip: skip },
    { $limit: limit },
  ];
  return DeckCard.aggregate(pipeline).exec();
}

export async function countSearchByDeck({ deckId, tag, q }) {
  const pipeline = [...buildSearchPipeline({ deckId, tag, q }), { $count: 'n' }];
  const result = await DeckCard.aggregate(pipeline).exec();
  return result[0]?.n ?? 0;
}

export async function listDistinctTags(deckId) {
  const tags = await DeckCard.distinct('tags', { deck: toObjectId(deckId) });
  return [...tags].sort();
}
```

- [ ] **Step 2: Write a temporary manual-verification script**

```js
// scripts/manual-verify-card-search.js
// Temporary script — delete after use, do not commit.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/db.js';
import * as deckCardRepository from '../src/repository/deckCard.js';
import { Deck } from '../src/models/Deck.js';
import { DeckCard } from '../src/models/DeckCard.js';

const run = async () => {
  await connectDB();

  // Grab any deck that actually has cards, to exercise the pipeline for real.
  const sample = await DeckCard.findOne().lean().exec();
  if (!sample) {
    console.log('No DeckCard documents in this DB — add at least one card to a deck first.');
    return;
  }
  const deckId = sample.deck.toString();
  const deck = await Deck.findById(deckId).lean().exec();
  console.log(`Using deck: ${deck?.name} (${deckId})`);

  const noFilter = await deckCardRepository.searchByDeck({ deckId, tag: undefined, q: '', sort: 'old', skip: 0, limit: 10 });
  console.log(`No filter: ${noFilter.length} docs, first cardDoc.front.text=${noFilter[0]?.cardDoc?.front?.text}`);

  const total = await deckCardRepository.countSearchByDeck({ deckId, tag: undefined, q: '' });
  console.log(`Total (no filter): ${total}`);

  const probe = noFilter[0]?.cardDoc?.front?.text?.slice(0, 3) ?? '';
  if (probe) {
    const searched = await deckCardRepository.searchByDeck({ deckId, tag: undefined, q: probe, sort: 'old', skip: 0, limit: 10 });
    console.log(`Search q="${probe}": ${searched.length} docs (expected >= 1, must include the probed card)`);
  }

  const tags = await deckCardRepository.listDistinctTags(deckId);
  console.log(`Distinct tags: ${JSON.stringify(tags)}`);
};

run()
  .then(() => mongoose.disconnect())
  .then(() => console.log('Done.'))
  .catch((error) => {
    console.error(error);
    return mongoose.disconnect();
  });
```

- [ ] **Step 3: Run it and confirm the expected shape**

```bash
cd /Users/egorzozula/Desktop/AnkiBackendCopy
node scripts/manual-verify-card-search.js
```

Expected output: a deck name + id, a non-zero "No filter" count matching "Total (no filter)", a "Search q=..." line showing at least 1 match, and a `Distinct tags` array (may be `[]` if no cards have tags — that's fine).

If there are zero `DeckCard` documents in your local DB, first add a card to a deck via the running frontend (or `mongosh` insert) before this step.

- [ ] **Step 4: Delete the temporary script**

```bash
rm /Users/egorzozula/Desktop/AnkiBackendCopy/scripts/manual-verify-card-search.js
```

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiBackendCopy
git add src/repository/deckCard.js
git commit -m "feat: add deck-card search aggregation + distinct-tags repository methods"
```

---

### Task 3: `cardService.js` — paginated search + tags

**Files:**
- Modify: `src/services/cardService.js`

**Interfaces:**
- Consumes: `deckCardRepository.searchByDeck`/`countSearchByDeck`/`listDistinctTags` (Task 2), `parseSearchQuery` (Task 1), existing `toDeckCardEntry` (`src/dto/cardDto.js`), existing `parseTagFilter`, `deckService.loadDeckOr404`/`assertCanAccessDeck`.
- Produces: `cardService.getDeckCards(authUser, deckId, query): Promise<{items: DeckCardEntry[], total: number, page: number, pageSize: number}>` (contract change — was `Promise<DeckCardEntry[]>`), `cardService.getDeckCardTags(authUser, deckId): Promise<string[]>`. Task 4 (controller) depends on both.

- [ ] **Step 1: Add the import**

At the top of `src/services/cardService.js`, after the existing imports, add:

```js
import { parseSearchQuery } from '../utils/search.js';
```

- [ ] **Step 2: Replace `getDeckCards` and remove the now-unused helpers it alone used**

Delete this block (currently lines 148-170):

```js
const buildCardMap = (cards) =>
  new Map(cards.map((card) => [card._id.toString(), card]));

const toEntryFromMap = (cardMap) => (deckCard) => {
  const card = cardMap.get(deckCard.card.toString());
  if (!card) return null;
  return toDeckCardEntry({ card, deckCard });
};

const isPresent = (value) => value !== null;

export async function getDeckCards(authUser, deckId, query) {
  assertObjectId(deckId, 'deckId');
  const deck = await deckService.loadDeckOr404(deckId);
  deckService.assertCanAccessDeck(deck, authUser);

  const tag = parseTagFilter(query?.tag);
  const deckCards = await deckCardRepository.listByDeck({ deckId, tag });
  const cardIds = deckCards.map((deckCard) => deckCard.card.toString());
  const cards = await cardRepository.findByIds(cardIds);
  const cardMap = buildCardMap(cards);
  return deckCards.map(toEntryFromMap(cardMap)).filter(isPresent);
}
```

Replace it with:

```js
const isPresent = (value) => value !== null;

const DEFAULT_CARD_PAGE_SIZE = 10;
const MAX_CARD_PAGE_SIZE = 50;
const CARD_SORTS = ['new', 'old'];

const parseCardPage = (raw) => {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return 1;
  return value;
};

const parseCardPageSize = (raw) => {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return DEFAULT_CARD_PAGE_SIZE;
  return Math.min(value, MAX_CARD_PAGE_SIZE);
};

const parseCardSort = (raw) => (CARD_SORTS.includes(raw) ? raw : 'old');

const toEntryFromAggregate = (doc) =>
  toDeckCardEntry({
    card: doc.cardDoc,
    deckCard: { tags: doc.tags, addedAt: doc.addedAt },
  });

export async function getDeckCards(authUser, deckId, query) {
  assertObjectId(deckId, 'deckId');
  const deck = await deckService.loadDeckOr404(deckId);
  deckService.assertCanAccessDeck(deck, authUser);

  const tag = parseTagFilter(query?.tag);
  const q = parseSearchQuery(query?.q);
  const sort = parseCardSort(query?.sort);
  const page = parseCardPage(query?.page);
  const pageSize = parseCardPageSize(query?.pageSize);
  const skip = (page - 1) * pageSize;

  const [docs, total] = await Promise.all([
    deckCardRepository.searchByDeck({ deckId, tag, q, sort, skip, limit: pageSize }),
    deckCardRepository.countSearchByDeck({ deckId, tag, q }),
  ]);

  const items = docs.map(toEntryFromAggregate).filter(isPresent);
  return { items, total, page, pageSize };
}

export async function getDeckCardTags(authUser, deckId) {
  assertObjectId(deckId, 'deckId');
  const deck = await deckService.loadDeckOr404(deckId);
  deckService.assertCanAccessDeck(deck, authUser);
  return deckCardRepository.listDistinctTags(deckId);
}
```

Note: `cardRepository.findByIds` is no longer called from this file, but leave `repository/card.js` untouched — it's a small, harmless, independently-useful method; removing it is out of scope.

- [ ] **Step 3: Manual verification (via Node REPL-style script, not curl — auth is cookie-based)**

Since `getDeckCards`/`getDeckCardTags` aren't wired to routes yet, verify them directly the same way as Task 2 — reuse the same throwaway-script pattern:

```bash
cd /Users/egorzozula/Desktop/AnkiBackendCopy
node -e "
import('dotenv/config').then(async () => {
  const { connectDB } = await import('./src/db.js');
  const cardService = await import('./src/services/cardService.js');
  const { DeckCard } = await import('./src/models/DeckCard.js');
  await connectDB();
  const sample = await DeckCard.findOne().lean().exec();
  if (!sample) { console.log('No DeckCard docs — add a card first.'); process.exit(0); }
  const deckId = sample.deck.toString();
  const result = await cardService.getDeckCards(null, deckId, { page: '1', pageSize: '5' });
  console.log(JSON.stringify({ total: result.total, page: result.page, pageSize: result.pageSize, itemCount: result.items.length }, null, 2));
  const tags = await cardService.getDeckCardTags(null, deckId);
  console.log('tags:', tags);
  process.exit(0);
});
"
```

Expected: JSON with `total >= 1`, `page: 1`, `pageSize: 5`, `itemCount` matching `min(total, 5)`; `tags` an array (possibly empty). This will only work if the sample deck is `public` or `unlisted` (since `authUser` is `null` here, exactly like an anonymous request) — if it errors with "Deck not found", pick a public deck, or temporarily pass a real user object matching the deck's owner.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiBackendCopy
git add src/services/cardService.js
git commit -m "feat: paginate + search getDeckCards, add getDeckCardTags"
```

---

### Task 4: Controller + route wiring, full HTTP contract verification

**Files:**
- Modify: `src/controllers/cardController.js`
- Modify: `src/routes/subroutes/deckRoutes.js`

**Interfaces:**
- Consumes: `cardService.getDeckCards`/`getDeckCardTags` (Task 3).
- Produces: HTTP contract `GET /api/decks/:deckId/cards?q&tag&sort&page&pageSize → {items,total,page,pageSize}` and `GET /api/decks/:deckId/cards/tags → string[]`. Frontend Task 5 depends on this contract.

- [ ] **Step 1: Add the `listTags` controller action**

In `src/controllers/cardController.js`, add this function (next to the existing `listByDeck`):

```js
export async function listTags(req, res) {
  try {
    const result = await cardService.getDeckCardTags(req.user, req.params?.deckId);
    ok(res, result);
  } catch (error) {
    httpResponseError(res, error);
  }
}
```

- [ ] **Step 2: Register the route**

In `src/routes/subroutes/deckRoutes.js`, add this line right after the existing `router.get('/:deckId/cards', ...)` line:

```js
router.get('/:deckId/cards/tags', optionalAuth, cardController.listTags);
```

- [ ] **Step 3: Manual verification — full contract via curl against a public deck**

Start the backend if it isn't already running: `cd /Users/egorzozula/Desktop/AnkiBackendCopy && npm run dev`

Pick a deck id that is `visibility: public` (or `unlisted`) and has at least 2-3 cards — either one you already have, or create one via the frontend UI. Then:

```bash
DECK_ID=<paste a public deck id here>

curl -s "http://localhost:9000/api/decks/$DECK_ID/cards" | python3 -m json.tool | head -30
curl -s "http://localhost:9000/api/decks/$DECK_ID/cards?page=1&pageSize=1" | python3 -m json.tool
curl -s "http://localhost:9000/api/decks/$DECK_ID/cards?q=zzz_definitely_not_a_real_word" | python3 -m json.tool
curl -s "http://localhost:9000/api/decks/$DECK_ID/cards/tags" | python3 -m json.tool
```

Expected:
- First call: `200`, body `{"items": [...], "total": N, "page": 1, "pageSize": 10}`.
- Second call: `{"items": [<one item>], "total": N, "page": 1, "pageSize": 1}`.
- Third call (nonsense query): `{"items": [], "total": 0, "page": 1, "pageSize": 10}`.
- Fourth call: a JSON array of strings (or `[]`).

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiBackendCopy
git add src/controllers/cardController.js src/routes/subroutes/deckRoutes.js
git commit -m "feat: expose GET /decks/:deckId/cards/tags endpoint"
```

---

## Frontend tasks (repo: `/Users/egorzozula/Desktop/AnkiFrontCopy`)

### Task 5: Types, API config, constants

**Files:**
- Modify: `services/configs/anki.types.ts`
- Modify: `services/configs/deck.config.ts`
- Modify: `lib/anki/constants.ts`

**Interfaces:**
- Produces: `DeckCardsResult`, `CardSort` types (`anki.types.ts`); `deckApi.listCards(...): Promise<DeckCardsResult>`, `deckApi.listCardTags(...): Promise<string[]>` (`deck.config.ts`); `DECK_CARDS_PAGE_SIZE` constant (`constants.ts`). Tasks 8 and 9 depend on all of these.

- [ ] **Step 1: Add `CardSort` and `DeckCardsResult` to `anki.types.ts`**

Immediately after the `DeckCardEntry` interface (currently ending around line 47), add:

```ts
type CardSort = 'new' | 'old'

// Paginated result for GET /decks/:deckId/cards (search + pagination).
interface DeckCardsResult {
	items: DeckCardEntry[]
	total: number
	page: number
	pageSize: number
}
```

Add both to the `export type { ... }` block at the bottom of the file:

```ts
	CardSort,
	DeckCardsResult,
```

- [ ] **Step 2: Update `deck.config.ts`**

Add `DeckCardsResult` to the type import at the top of `services/configs/deck.config.ts`:

```ts
import type {
	DeckDTO,
	DeckCardEntry,
	DeckCardLink,
	DeckCardsResult,
	CreateDeckBody,
	UpdateDeckBody,
	CreateCardBody,
	LinkCardBody,
	UpdateTagsBody,
	DeleteDeckResult,
	RemoveCardFromDeckResult,
	ExploreResult,
	SavedDeckDTO,
	SubscribeResult,
} from './anki.types'
```

Change the `listCards` endpoint's response type from `DeckCardEntry[]` to `DeckCardsResult`:

```ts
	listCards: endpoint<void, DeckCardsResult>({
		url: ({ deckId }) => `/api/decks/${deckId}/cards`,
		method: getData,
		defaultErrorMessage: 'Failed to load cards',
	}),
```

Add a new `listCardTags` endpoint right after `listCards`:

```ts
	listCardTags: endpoint<void, string[]>({
		url: ({ deckId }) => `/api/decks/${deckId}/cards/tags`,
		method: getData,
		defaultErrorMessage: 'Failed to load tags',
	}),
```

- [ ] **Step 3: Add `DECK_CARDS_PAGE_SIZE` to `lib/anki/constants.ts`**

Add this constant near `WORDS_PAGE_SIZE`:

```ts
// Cards per page on the deck detail (card-list) view.
const DECK_CARDS_PAGE_SIZE = 10
```

Add it to the `export { ... }` block at the bottom of the file.

- [ ] **Step 4: Manual verification**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
npx tsc --noEmit
```

Expected: this will show pre-existing errors in `DeckDetailPage`/`WordsTablePage` (they still assume `listCards` returns an array — that's expected and fixed in Tasks 8/9). There must be **no** errors in `services/configs/anki.types.ts` or `services/configs/deck.config.ts` themselves.

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
git add services/configs/anki.types.ts services/configs/deck.config.ts lib/anki/constants.ts
git commit -m "feat: paginated DeckCardsResult type + listCardTags endpoint"
```

---

### Task 6: Shared UI utils (debounce hook, page-list builder) + `/explore` refactor

**Files:**
- Create: `hooks/use-debounced-search-input.ts`
- Create: `lib/anki/build-page-list.ts`
- Modify: `app/[locale]/(app)/explore/page.tsx`

**Interfaces:**
- Produces: `useDebouncedSearchInput(committedValue: string, debounceMs: number, onCommit: (value: string) => void): readonly [string, Dispatch<SetStateAction<string>>]`; `buildPageList(current: number, total: number): Array<number | 'gap'>`. Tasks 8 and 9 depend on both.

- [ ] **Step 1: Create the debounce hook**

```ts
// hooks/use-debounced-search-input.ts
import { useEffect, useState } from 'react'

// Local input state that debounces into a committed value (typically pushed
// into the URL) after `debounceMs` of no typing. Shared by the search boxes
// on /explore and the deck pages, so the backend isn't queried per keystroke.
function useDebouncedSearchInput(
	committedValue: string,
	debounceMs: number,
	onCommit: (value: string) => void,
) {
	const [value, setValue] = useState(committedValue)

	useEffect(() => {
		const handle = setTimeout(() => {
			if (value !== committedValue) onCommit(value)
		}, debounceMs)
		return () => clearTimeout(handle)
	}, [value, committedValue, onCommit])

	return [value, setValue] as const
}

export { useDebouncedSearchInput }
```

- [ ] **Step 2: Create the page-list builder**

```ts
// lib/anki/build-page-list.ts
// Compact page list with ellipsis: 1 … current-1 current current+1 … total
const buildPageList = (current: number, total: number): Array<number | 'gap'> => {
	const wanted = [1, total, current - 1, current, current + 1]
	const inRange = (page: number) => page >= 1 && page <= total
	const unique = Array.from(new Set(wanted.filter(inRange))).sort(
		(a, b) => a - b,
	)
	const withGap = (page: number, index: number): Array<number | 'gap'> => {
		const previous = unique[index - 1]
		const hasGap = index > 0 && page - previous > 1
		return hasGap ? ['gap', page] : [page]
	}
	return unique.flatMap(withGap)
}

export { buildPageList }
```

- [ ] **Step 3: Refactor `explore/page.tsx` to use both**

Add these imports (alongside the existing ones):

```ts
import { useDebouncedSearchInput } from '@/hooks/use-debounced-search-input'
import { buildPageList } from '@/lib/anki/build-page-list'
```

Delete the local `buildPageList` function (currently lines 44-56):

```ts
// Compact page list with ellipsis: 1 … current-1 current current+1 … total
const buildPageList = (current: number, total: number): Array<number | 'gap'> => {
	const wanted = [1, total, current - 1, current, current + 1]
	const inRange = (page: number) => page >= 1 && page <= total
	const unique = Array.from(new Set(wanted.filter(inRange))).sort(
		(a, b) => a - b,
	)
	const withGaps = (page: number, index: number): Array<number | 'gap'> => {
		const previous = unique[index - 1]
		const hasGap = index > 0 && page - previous > 1
		return hasGap ? ['gap', page] : [page]
	}
	return unique.flatMap(withGaps)
}
```

Replace the local search-input state + debounce effect (currently lines 92 and 110-116):

```ts
	const [searchInput, setSearchInput] = useState(q)
```

```ts
	// Debounce the search box into the URL (resetting to page 1).
	useEffect(() => {
		const handle = setTimeout(() => {
			if (searchInput !== q) pushParams({ q: searchInput, page: 1 })
		}, EXPLORE_SEARCH_DEBOUNCE_MS)
		return () => clearTimeout(handle)
	}, [searchInput, q, pushParams])
```

with:

```ts
	const [searchInput, setSearchInput] = useDebouncedSearchInput(
		q,
		EXPLORE_SEARCH_DEBOUNCE_MS,
		useCallback((next: string) => pushParams({ q: next, page: 1 }), [pushParams]),
	)
```

(`useCallback` is already imported in this file; `useEffect` stays imported since the cards-loading effect further down still uses it.)

- [ ] **Step 4: Manual verification — `/explore` behaves exactly as before**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
npm run dev
```

Open `http://localhost:3000/explore` in a browser:
1. Type a search term — confirm results update ~350ms after you stop typing, and the URL gets a `?q=` param.
2. Clear the input — confirm it goes back to the unfiltered list and `?q=` is removed from the URL.
3. If there's more than one page of results, click a page number — confirm it still navigates and highlights correctly.
4. Reload the page with a `?q=...` URL directly — confirm the input is pre-filled with that value.

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
git add hooks/use-debounced-search-input.ts lib/anki/build-page-list.ts "app/[locale]/(app)/explore/page.tsx"
git commit -m "refactor: extract shared debounced-search hook + page-list builder"
```

---

### Task 7: i18n additions

**Files:**
- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Add keys to `en.json`**

Inside the `anki.words` object, add:

```json
"searchPlaceholder": "Search words...",
"noSearchResults": "No words match your search",
```

Inside the `anki.deck` object, add:

```json
"noSearchResultsTitle": "No matching cards",
"noSearchResultsDescription": "Try a different search.",
```

- [ ] **Step 2: Add keys to `uk.json`**

Inside the `anki.words` object, add:

```json
"searchPlaceholder": "Пошук слів...",
"noSearchResults": "Немає слів за цим пошуком",
```

Inside the `anki.deck` object, add:

```json
"noSearchResultsTitle": "Нічого не знайдено",
"noSearchResultsDescription": "Спробуйте інший запит.",
```

- [ ] **Step 3: Manual verification**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
node -e "JSON.parse(require('fs').readFileSync('i18n/messages/en.json')); JSON.parse(require('fs').readFileSync('i18n/messages/uk.json')); console.log('valid JSON')"
```

Expected: `valid JSON` printed with no error (catches trailing-comma/syntax mistakes before they hit Next.js).

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat: add i18n strings for deck/words search"
```

---

### Task 8: Deck detail page — search + pagination + tags endpoint

**Files:**
- Modify: `app/[locale]/(app)/decks/[deckId]/page.tsx`

**Interfaces:**
- Consumes: `deckApi.listCards`/`listCardTags` (Task 5), `useDebouncedSearchInput`/`buildPageList` (Task 6), i18n keys from Task 7.

- [ ] **Step 1: Replace the full file content**

```tsx
'use client'

import Link from 'next/link'
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
	ArrowLeft,
	Check,
	ChevronLeft,
	ChevronRight,
	Inbox,
	Play,
	Plus,
	Search,
	Table2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from '@/components/ui/pagination'
import { VisibilityBadge } from '@/components/anki/visibility-badge'
import { TagFilter } from '@/components/anki/tag-filter'
import { QuickAddCard } from '@/components/anki/quick-add-card'
import { DeckCardEntryItem } from '@/components/anki/deck-card-entry-item'
import { useDebouncedSearchInput } from '@/hooks/use-debounced-search-input'
import { buildPageList } from '@/lib/anki/build-page-list'
import { deckApi } from '@/services'
import type { DeckCardEntry, DeckDTO } from '@/services'
import {
	DECK_CARDS_PAGE_SIZE,
	EXPLORE_SEARCH_DEBOUNCE_MS,
} from '@/lib/anki/constants'
import { isApiErrorWithStatus, useApiErrorToast } from '@/lib/anki/use-api-error'
import { useUser } from '@/lib/auth/user-provider'

export default function DeckDetailPage() {
	const { deckId } = useParams<{ deckId: string }>()
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const user = useUser()

	const q = searchParams.get('q') ?? ''
	const page = Math.max(1, Number(searchParams.get('page')) || 1)

	const [deck, setDeck] = useState<DeckDTO | null>(null)
	const [entries, setEntries] = useState<DeckCardEntry[]>([])
	const [total, setTotal] = useState(0)
	const [allTags, setAllTags] = useState<string[]>([])
	const [selectedTag, setSelectedTag] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [deckMissing, setDeckMissing] = useState(false)
	const [subscribed, setSubscribed] = useState(false)
	const [subPending, setSubPending] = useState(false)

	const isOwner = deck ? (deck.isOwner ?? deck.ownerId === user.id) : false

	const pushParams = useCallback(
		(next: { q?: string; page?: number }) => {
			const params = new URLSearchParams(searchParams.toString())
			if (next.q !== undefined) {
				if (next.q) params.set('q', next.q)
				else params.delete('q')
			}
			if (next.page) params.set('page', String(next.page))
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams],
	)

	const [searchInput, setSearchInput] = useDebouncedSearchInput(
		q,
		EXPLORE_SEARCH_DEBOUNCE_MS,
		useCallback((next: string) => pushParams({ q: next, page: 1 }), [pushParams]),
	)

	const refreshDeckMeta = useCallback(async () => {
		try {
			const [deckResult, tags] = await Promise.all([
				deckApi.getById({ pathParams: { deckId }, silent: true }),
				deckApi.listCardTags({ pathParams: { deckId }, silent: true }),
			])
			setDeck(deckResult)
			setSubscribed(!!deckResult.isSubscribed)
			setAllTags(tags)
		} catch (error) {
			if (isApiErrorWithStatus(error, 404)) {
				setDeckMissing(true)
				return
			}
			notifyApiError(error)
		}
	}, [deckId, notifyApiError])

	const refreshEntries = useCallback(async () => {
		try {
			const result = await deckApi.listCards({
				pathParams: { deckId },
				queryParams: {
					q: q || undefined,
					tag: selectedTag ?? undefined,
					page,
					pageSize: DECK_CARDS_PAGE_SIZE,
				},
				silent: true,
			})
			setEntries(result.items)
			setTotal(result.total)
		} catch (error) {
			notifyApiError(error)
		}
	}, [deckId, q, selectedTag, page, notifyApiError])

	useEffect(() => {
		const run = async () => {
			await refreshDeckMeta()
		}
		run()
	}, [refreshDeckMeta])

	useEffect(() => {
		const run = async () => {
			await refreshEntries()
			setLoading(false)
		}
		run()
	}, [refreshEntries])

	const handleChanged = useCallback(() => {
		refreshDeckMeta()
		refreshEntries()
	}, [refreshDeckMeta, refreshEntries])

	const handleSelectTag = (tag: string | null) => {
		setSelectedTag(tag)
		pushParams({ page: 1 })
	}

	const subscribe = async () => {
		await deckApi.subscribe({ pathParams: { deckId }, silent: true })
		setSubscribed(true)
		toast.success(t('explore.subscribed'))
	}

	const unsubscribe = async () => {
		await deckApi.unsubscribe({ pathParams: { deckId }, silent: true })
		setSubscribed(false)
		toast.success(t('explore.unsubscribed'))
	}

	const handleToggleSubscribe = async () => {
		setSubPending(true)
		try {
			await (subscribed ? unsubscribe() : subscribe())
		} catch (error) {
			notifyApiError(error)
		} finally {
			setSubPending(false)
		}
	}

	const renderEntry = (entry: DeckCardEntry) => (
		<DeckCardEntryItem
			key={entry.id}
			deckId={deckId}
			card={entry}
			onChanged={handleChanged}
			readOnly={!isOwner}
		/>
	)

	const renderSubscribeIcon = () => {
		if (subPending) return <Spinner />
		return subscribed ? <Check /> : <Plus />
	}

	const totalPages = Math.max(1, Math.ceil(total / DECK_CARDS_PAGE_SIZE))
	const goToPage = (target: number) => pushParams({ page: target })
	const goToPageHandler = (target: number) => () => goToPage(target)

	const renderPageItem = (item: number | 'gap', index: number) => {
		if (item === 'gap') {
			return (
				<PaginationItem key={`gap-${index}`}>
					<PaginationEllipsis />
				</PaginationItem>
			)
		}
		return (
			<PaginationItem key={item}>
				<Button
					variant={item === page ? 'outline' : 'ghost'}
					size="icon"
					onClick={goToPageHandler(item)}
					aria-current={item === page ? 'page' : undefined}
				>
					{item}
				</Button>
			</PaginationItem>
		)
	}

	if (deckMissing) {
		return (
			<div className="py-6">
				<Empty className="py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>{t('deck.notFoundTitle')}</EmptyTitle>
						<EmptyDescription>{t('deck.notFoundDescription')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant="outline" render={<Link href="/decks" />}>
							<ArrowLeft />
							{t('deck.backToDecks')}
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		)
	}

	if (loading || !deck) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-24" />
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-4 w-96" />
				<div className="space-y-3">
					<Skeleton className="h-20 rounded-lg" />
					<Skeleton className="h-20 rounded-lg" />
					<Skeleton className="h-20 rounded-lg" />
				</div>
			</div>
		)
	}

	// `deck` is narrowed to non-null below the guard above, so no `?.` is needed.
	const renderEmptyTitle = () => {
		if (q) return t('deck.noSearchResultsTitle')
		if (selectedTag) return t('deck.noTaggedCards')
		return t('deck.noCardsTitle')
	}

	const renderEmptyDescription = () => {
		if (q) return t('deck.noSearchResultsDescription')
		if (selectedTag) return t('deck.noTaggedCardsDescription', { tag: selectedTag })
		if (isOwner) return t('deck.noCardsDescription')
		return t('deck.readonlyHint', { name: deck.ownerName ?? '' })
	}

	return (
		<div className="space-y-6">
			<Link
				href="/decks"
				className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
			>
				<ArrowLeft className="size-4" />
				{t('deck.backToDecks')}
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 space-y-2">
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-xl font-semibold break-words sm:text-2xl">
							{deck.name}
						</h1>
						<VisibilityBadge visibility={deck.visibility} />
					</div>
					{!isOwner && deck.ownerName && (
						<p className="text-muted-foreground text-sm">
							{t('deck.by', { name: deck.ownerName })}
						</p>
					)}
					{deck.description && (
						<p className="text-muted-foreground max-w-prose text-sm">
							{deck.description}
						</p>
					)}
					<p className="text-muted-foreground text-sm">
						{t('deck.cardCount', { count: deck.cardCount ?? total })}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{!isOwner && (
						<Button
							variant={subscribed ? 'outline' : 'secondary'}
							onClick={handleToggleSubscribe}
							disabled={subPending}
						>
							{renderSubscribeIcon()}
							{subscribed ? t('deck.unsubscribe') : t('deck.subscribe')}
						</Button>
					)}
					<Button
						variant="outline"
						render={<Link href={`/decks/${deckId}/words`} />}
					>
						<Table2 />
						{t('words.link')}
					</Button>
					<Button render={<Link href={`/decks/${deckId}/study`} />}>
						<Play />
						{t('study.start')}
					</Button>
				</div>
			</div>

			{isOwner && <QuickAddCard deckId={deckId} onAdded={handleChanged} />}

			<div className="relative min-w-0">
				<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder={t('words.searchPlaceholder')}
					className="pl-9"
					aria-label={t('words.searchPlaceholder')}
				/>
			</div>

			{allTags.length > 0 && (
				<TagFilter
					tags={allTags}
					selected={selectedTag}
					onSelect={handleSelectTag}
				/>
			)}

			{entries.length === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>{renderEmptyTitle()}</EmptyTitle>
						<EmptyDescription>{renderEmptyDescription()}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="space-y-3">{entries.map(renderEntry)}</div>

					{totalPages > 1 && (
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<Button
										variant="ghost"
										onClick={goToPageHandler(page - 1)}
										disabled={page <= 1}
									>
										<ChevronLeft />
										<span className="hidden sm:block">{t('words.prev')}</span>
									</Button>
								</PaginationItem>
								{buildPageList(page, totalPages).map(renderPageItem)}
								<PaginationItem>
									<Button
										variant="ghost"
										onClick={goToPageHandler(page + 1)}
										disabled={page >= totalPages}
									>
										<span className="hidden sm:block">{t('words.next')}</span>
										<ChevronRight />
									</Button>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</>
			)}
		</div>
	)
}
```

- [ ] **Step 2: Manual verification**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
npx tsc --noEmit
```

Expected: no errors in this file. Then, with both dev servers running (backend `npm run dev` in `AnkiBackendCopy`, frontend `npm run dev` in `AnkiFrontCopy`):

1. Open a deck you own that has several cards (`/decks/<id>`). Confirm the full card list renders as before.
2. Type a word you know exists (front or back text) into the new search box — confirm the list narrows to matching cards after ~350ms, and the URL gets `?q=...`.
3. Type a nonsense string — confirm the empty state shows "No matching cards" / "Try a different search" (not the generic "no cards" message).
4. Clear the search — confirm the full list returns.
5. If the deck has 11+ cards, confirm a `Pagination` control appears at the bottom and page navigation works.
6. If the deck has tagged cards, select a tag and confirm it still filters (tag filter untouched, still local state); combine a tag selection with a search term and confirm both apply together.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
git add "app/[locale]/(app)/decks/[deckId]/page.tsx"
git commit -m "feat: add search + pagination to the deck card-list page"
```

---

### Task 9: Words table page — search, server-side sort/pagination

**Files:**
- Modify: `app/[locale]/(app)/decks/[deckId]/words/page.tsx`

**Interfaces:**
- Consumes: `deckApi.listCards` (Task 5), `useDebouncedSearchInput`/`buildPageList` (Task 6), i18n keys from Task 7.

- [ ] **Step 1: Replace the full file content**

```tsx
'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
	ArrowDownWideNarrow,
	ArrowLeft,
	ArrowLeftRight,
	ArrowUpNarrowWide,
	ChevronLeft,
	ChevronRight,
	Inbox,
	Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from '@/components/ui/pagination'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { RevealText } from '@/components/anki/reveal-text'
import { useDebouncedSearchInput } from '@/hooks/use-debounced-search-input'
import { buildPageList } from '@/lib/anki/build-page-list'
import { deckApi } from '@/services'
import type { DeckCardEntry, DeckDTO } from '@/services'
import { EXPLORE_SEARCH_DEBOUNCE_MS, WORDS_PAGE_SIZE } from '@/lib/anki/constants'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

type SortOrder = 'new' | 'old'

// Per-deck localStorage key remembering whether the word/translation columns are
// swapped (so each deck keeps its own orientation across visits).
const SWAP_STORAGE_PREFIX = 'memwords:words-swap:'

export default function WordsTablePage() {
	const { deckId } = useParams<{ deckId: string }>()
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()

	const [deck, setDeck] = useState<DeckDTO | null>(null)
	const [entries, setEntries] = useState<DeckCardEntry[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [swapped, setSwapped] = useState(false)

	const q = searchParams.get('q') ?? ''
	const sort: SortOrder = searchParams.get('sort') === 'old' ? 'old' : 'new'
	const page = Math.max(1, Number(searchParams.get('page')) || 1)
	const swapStorageKey = `${SWAP_STORAGE_PREFIX}${deckId}`

	// Read the saved orientation after mount (localStorage is client-only).
	useEffect(() => {
		setSwapped(window.localStorage.getItem(swapStorageKey) === '1')
	}, [swapStorageKey])

	const toggleSwap = () => {
		const next = !swapped
		window.localStorage.setItem(swapStorageKey, next ? '1' : '0')
		setSwapped(next)
	}

	const firstSide = (entry: DeckCardEntry) =>
		swapped ? entry.back : entry.front
	const secondSide = (entry: DeckCardEntry) =>
		swapped ? entry.front : entry.back

	useEffect(() => {
		const loadDeck = async () => {
			const result = await deckApi
				.getById({ pathParams: { deckId }, silent: true })
				.catch(() => null)
			setDeck(result)
		}
		loadDeck()
	}, [deckId])

	const refreshEntries = useCallback(async () => {
		try {
			const result = await deckApi.listCards({
				pathParams: { deckId },
				queryParams: { q: q || undefined, sort, page, pageSize: WORDS_PAGE_SIZE },
				silent: true,
			})
			setEntries(result.items)
			setTotal(result.total)
		} catch (error) {
			notifyApiError(error)
		} finally {
			setLoading(false)
		}
	}, [deckId, q, sort, page, notifyApiError])

	useEffect(() => {
		refreshEntries()
	}, [refreshEntries])

	const totalPages = Math.max(1, Math.ceil(total / WORDS_PAGE_SIZE))

	const pushParams = useCallback(
		(next: { q?: string; page?: number; sort?: SortOrder }) => {
			const params = new URLSearchParams(searchParams.toString())
			if (next.q !== undefined) {
				if (next.q) params.set('q', next.q)
				else params.delete('q')
			}
			if (next.sort) params.set('sort', next.sort)
			if (next.page) params.set('page', String(next.page))
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams],
	)

	const [searchInput, setSearchInput] = useDebouncedSearchInput(
		q,
		EXPLORE_SEARCH_DEBOUNCE_MS,
		useCallback((next: string) => pushParams({ q: next, page: 1 }), [pushParams]),
	)

	const goToPage = (target: number) => pushParams({ page: target })
	const goToPageHandler = (target: number) => () => goToPage(target)
	const toggleSort = () =>
		pushParams({ sort: sort === 'new' ? 'old' : 'new', page: 1 })

	const renderTagBadge = (tag: string) => (
		<Badge key={tag} variant="outline" className="text-xs">
			{tag}
		</Badge>
	)

	const renderRow = (entry: DeckCardEntry, index: number) => (
		<TableRow key={entry.id}>
			<TableCell className="text-muted-foreground tabular-nums">
				{(page - 1) * WORDS_PAGE_SIZE + index + 1}
			</TableCell>
			<TableCell className="font-medium">{firstSide(entry).text}</TableCell>
			<TableCell>
				<RevealText text={secondSide(entry).text} />
			</TableCell>
			<TableCell className="hidden sm:table-cell">
				<div className="flex flex-wrap gap-1">
					{entry.tags.map(renderTagBadge)}
				</div>
			</TableCell>
		</TableRow>
	)

	const renderPageItem = (item: number | 'gap', index: number) => {
		if (item === 'gap') {
			return (
				<PaginationItem key={`gap-${index}`}>
					<PaginationEllipsis />
				</PaginationItem>
			)
		}
		return (
			<PaginationItem key={item}>
				<Button
					variant={item === page ? 'outline' : 'ghost'}
					size="icon"
					onClick={goToPageHandler(item)}
					aria-current={item === page ? 'page' : undefined}
				>
					{item}
				</Button>
			</PaginationItem>
		)
	}

	const sortLabel = sort === 'new' ? t('words.sortNewest') : t('words.sortOldest')
	const SortIcon = sort === 'new' ? ArrowDownWideNarrow : ArrowUpNarrowWide

	return (
		<div className="space-y-5">
			<Link
				href={`/decks/${deckId}`}
				className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
			>
				<ArrowLeft className="size-4" />
				{t('study.backToDeck')}
			</Link>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">
						{deck ? deck.name : t('words.title')}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t('deck.cardCount', { count: total })}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant={swapped ? 'default' : 'outline'}
						onClick={toggleSwap}
					>
						<ArrowLeftRight />
						{t('words.swap')}
					</Button>
					<Button variant="outline" onClick={toggleSort}>
						<SortIcon />
						{sortLabel}
					</Button>
				</div>
			</div>

			<div className="relative min-w-0">
				<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder={t('words.searchPlaceholder')}
					className="pl-9"
					aria-label={t('words.searchPlaceholder')}
				/>
			</div>

			{loading ? (
				<div className="space-y-2">
					<Skeleton className="h-10 rounded-lg" />
					<Skeleton className="h-10 rounded-lg" />
					<Skeleton className="h-10 rounded-lg" />
				</div>
			) : total === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>{q ? t('words.noSearchResults') : t('words.empty')}</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="overflow-x-auto rounded-xl border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">#</TableHead>
									<TableHead>
										{swapped ? t('words.translation') : t('words.word')}
									</TableHead>
									<TableHead>
										{swapped ? t('words.word') : t('words.translation')}
									</TableHead>
									<TableHead className="hidden sm:table-cell">
										{t('words.tags')}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>{entries.map(renderRow)}</TableBody>
						</Table>
					</div>

					{totalPages > 1 && (
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<Button
										variant="ghost"
										onClick={goToPageHandler(page - 1)}
										disabled={page <= 1}
									>
										<ChevronLeft />
										<span className="hidden sm:block">{t('words.prev')}</span>
									</Button>
								</PaginationItem>
								{buildPageList(page, totalPages).map(renderPageItem)}
								<PaginationItem>
									<Button
										variant="ghost"
										onClick={goToPageHandler(page + 1)}
										disabled={page >= totalPages}
									>
										<span className="hidden sm:block">{t('words.next')}</span>
										<ChevronRight />
									</Button>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</>
			)}
		</div>
	)
}
```

- [ ] **Step 2: Manual verification**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
npx tsc --noEmit
```

Expected: no errors anywhere now (this was the last file still assuming the old array-returning `listCards`).

With both dev servers running, open `/decks/<id>/words` for a deck with several cards:

1. Confirm the table renders exactly as before (same columns, same default "Newest first" sort).
2. Type a search term — confirm rows narrow after ~350ms and `?q=...` appears in the URL.
3. Toggle "Sort" while a search term is active — confirm the result set stays filtered but re-orders (this is the server-side-sort regression check: previously sorting was a client re-sort over the full list, now it's a fresh backend request).
4. Type a nonsense string — confirm the empty state says "No words match your search" (not the generic "No words yet").
5. If there are 11+ matching rows, confirm pagination still works across pages while a search term is active.
6. Navigate from the deck's card-list page (Task 8) to this table view — confirm the `q` typed there does **not** carry over (each page has its own independent `q`, per the design decision) — i.e. this page's search box starts empty unless the words-page URL itself already has `?q=`.

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy
git add "app/[locale]/(app)/decks/[deckId]/words/page.tsx"
git commit -m "feat: add search to the words table, move sort/pagination server-side"
```

---

### Task 10: End-to-end manual verification (both repos running together)

**Files:** none — verification only.

- [ ] **Step 1: Start both servers**

```bash
cd /Users/egorzozula/Desktop/AnkiBackendCopy && npm run dev
```
```bash
cd /Users/egorzozula/Desktop/AnkiFrontCopy && npm run dev
```

- [ ] **Step 2: Full walkthrough**

Using a real logged-in account with a deck that has 15+ cards (mixed tags, some sharing similar words) spanning at least 2 pages at the default page size:

1. `/decks/<id>` — search a word, confirm results + pagination; combine with a tag filter; clear search, confirm full list + tag filter still applies; clear tag, confirm full unfiltered list.
2. `/decks/<id>/words` — search, confirm results + pagination; toggle sort with an active search; toggle "Swap sides" with an active search (should keep working, purely a display concern); clear search, confirm full table returns with correct default sort.
3. Copy a URL with `?q=...&page=2` from either page, paste it into a new tab — confirm it loads directly into that filtered/paginated state (URL persistence, per the design decision).
4. As a non-owner viewing someone else's public deck, confirm search still works (read-only view) and the subscribe/unsubscribe button still works unaffected.

- [ ] **Step 3: Report results**

No commit for this task — if all checks pass, the feature is complete. If anything fails, note which step and fix it in the relevant earlier task before considering the plan done.
