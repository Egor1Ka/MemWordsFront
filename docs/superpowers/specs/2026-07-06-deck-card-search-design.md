# Backend-driven card search on the deck page and words table

**Date:** 2026-07-06
**Scope:** `app/[locale]/(app)/decks/[deckId]/page.tsx`, `app/[locale]/(app)/decks/[deckId]/words/page.tsx`, `services/configs/deck.config.ts`, `services/configs/anki.types.ts`; backend `AnkiBackendCopy` — `src/routes/subroutes/deckRoutes.js`, `src/controllers/cardController.js`, `src/services/cardService.js`, `src/repository/deckCard.js`, `src/repository/card.js`, `src/dto/cardDto.js`
**Goal:** Add a single search input (word + translation + their descriptions) that queries the backend, on both the deck card list and its table view. Along the way, replace the current "fetch every card in the deck, do everything client-side" pattern with real server-side search, sort, and pagination — mirroring the existing `/explore` deck-search feature.

## 1. Current state (before this change)

- `GET /api/decks/:deckId/cards` (`cardService.getDeckCards`) returns **all** matching `DeckCardEntry[]` for a deck as a flat array. The only filter is an exact `tag` match. No search, no pagination, no sort.
- `DeckDetailPage` (the card-list view) fetches this full array and renders every entry, with a client-side `selectedTag` filter (local `useState`, not in the URL). No pagination UI exists there today.
- `WordsTablePage` (the table view) fetches the same full array (no tag filter applied), then does **client-side** sort (`newestFirst`/`oldestFirst` over `addedAt`) and **client-side** pagination (`WORDS_PAGE_SIZE = 10`, sliced in a `useMemo`).
- `/explore` (deck discovery) already has the pattern we want to replicate for cards: debounced search input → `q` pushed into the URL → backend call with `{ q, sort, page, pageSize }` → paginated `{ items, total, page, pageSize, sort }` response. Backend side: `deckService.exploreDecks` + `deckRepository.searchPublic`/`countPublic`, using an escaped case-insensitive regex `$or` match across `name`/`description`.
- Card content model: `CardSide { text, description, imageUrl }`; a card has `front`/`back`, each a `CardSide`. `DeckCardEntry` = card fields + `{ tags, addedAt }` (the deck-scoped link data).

## 2. Decisions

1. **Search fields:** `front.text`, `back.text`, `front.description`, `back.description` — all four text fields on both sides of the card, combined with `$or`.
2. **Search + tag filter:** combined with AND. Tag filter stays client-side local state (as today); search is server-side.
3. **Search persists in the URL** as `q`, independently on each page (consistent with `/explore`'s pattern), so it's shareable and survives navigation/back button.
4. **Full server-side pagination** (not just an in-memory filter): the deck-cards endpoint moves to a paginated contract like `/explore`'s. This means:
   - The card-list view (`DeckDetailPage`) gains a `Pagination` control — it no longer fetches "everything" in one call.
   - Sorting on the table view moves server-side (client-side re-sort of a partial page would be wrong once pagination is real).
5. Tag collection for the `TagFilter` UI is decoupled from the paginated cards endpoint via a new dedicated endpoint, since the filter must know about every tag in the deck, not just the current page.

## 3. Backend

### 3.1 API contract

```
GET /api/decks/:deckId/cards?q=&tag=&sort=&page=&pageSize=
→ { items: DeckCardEntry[], total: number, page: number, pageSize: number }
```

- `q` — free-text search string. Optional. Trimmed, capped at 100 chars (reusing the same validation shape as `/explore`'s `q`).
- `tag` — optional exact tag match (unchanged behavior).
- `sort` — `'new'` (addedAt desc) | `'old'` (addedAt asc). Default `'old'` when absent/invalid — this preserves today's unconditional `{ addedAt: 1 }` order for callers that don't pass it (the card-list view). The words-table page always sends its own explicit default (`'new'`), preserving its current default behavior.
- `page` — default `1`. `pageSize` — default `10`, capped at 50 (same caps as `/explore`).

```
GET /api/decks/:deckId/cards/tags
→ string[]   // distinct tags across the whole deck, sorted
```

### 3.2 Shared validation util

New `src/utils/search.js`:

```js
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseSearchQuery = (raw, maxLength = 100) => {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, maxLength);
};
```

`deckService.js`'s existing local `parseQuery`/regex-escape (used by `exploreDecks`/`deckRepository.buildPublicMatch`) switches to this shared util instead of keeping its own copy, since it's now needed in two places (deck search, card search).

### 3.3 `src/repository/deckCard.js` — new aggregation methods

```js
const CARD_SEARCH_FIELDS = ['front.text', 'back.text', 'front.description', 'back.description'];

// q arrives already parsed (trimmed/capped) by cardService — this only guards emptiness.
const buildCardTextMatch = (q) => {
  if (typeof q !== 'string' || q.length === 0) return null;
  const regex = new RegExp(escapeRegExp(q), 'i');
  return { $or: CARD_SEARCH_FIELDS.map((field) => ({ [`cardDoc.${field}`]: regex })) };
};

const SORT_STAGES = {
  new: { addedAt: -1, _id: -1 },
  old: { addedAt: 1, _id: 1 },
};

const buildSearchPipeline = ({ deckId, tag, q }) => {
  const match = { deck: toObjectId(deckId) };
  if (typeof tag === 'string' && tag.length > 0) match.tags = tag;
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
    { $sort: SORT_STAGES[sort] ?? SORT_STAGES.old },
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

The existing `listByDeck` stays untouched — it's also used by `reviewService.js` (the study queue, unrelated to this feature) — only `cardService.getDeckCards` switches from `listByDeck` to the new `searchByDeck`/`countSearchByDeck`.

### 3.4 `src/services/cardService.js`

```js
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const CARD_SORTS = ['new', 'old'];

const parsePage = (raw) => { const v = Number.parseInt(raw, 10); return Number.isFinite(v) && v >= 1 ? v : 1; };
const parsePageSize = (raw) => { const v = Number.parseInt(raw, 10); return Number.isFinite(v) && v >= 1 ? Math.min(v, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE; };
const parseCardSort = (raw) => (CARD_SORTS.includes(raw) ? raw : 'old');

const toEntryFromAggregate = (doc) =>
  toDeckCardEntry({ card: doc.cardDoc, deckCard: { tags: doc.tags, addedAt: doc.addedAt } });

export async function getDeckCards(authUser, deckId, query) {
  assertObjectId(deckId, 'deckId');
  const deck = await deckService.loadDeckOr404(deckId);
  deckService.assertCanAccessDeck(deck, authUser);

  const tag = parseTagFilter(query?.tag);
  const q = parseSearchQuery(query?.q);
  const sort = parseCardSort(query?.sort);
  const page = parsePage(query?.page);
  const pageSize = parsePageSize(query?.pageSize);
  const skip = (page - 1) * pageSize;

  const [docs, total] = await Promise.all([
    deckCardRepository.searchByDeck({ deckId, tag, q, sort, skip, limit: pageSize }),
    deckCardRepository.countSearchByDeck({ deckId, tag, q }),
  ]);

  return { items: docs.map(toEntryFromAggregate).filter(isPresent), total, page, pageSize };
}

export async function getDeckCardTags(authUser, deckId) {
  assertObjectId(deckId, 'deckId');
  const deck = await deckService.loadDeckOr404(deckId);
  deckService.assertCanAccessDeck(deck, authUser);
  return deckCardRepository.listDistinctTags(deckId);
}
```

### 3.5 Routes / controller

`cardController.js`: new `listTags` calling `cardService.getDeckCardTags`.
`deckRoutes.js`: add `router.get('/:deckId/cards/tags', optionalAuth, cardController.listTags);` next to the existing `GET /:deckId/cards`.

## 4. Frontend

### 4.1 Types & API config

`services/configs/anki.types.ts` — add:

```ts
type CardSort = 'new' | 'old'

interface DeckCardsResult {
	items: DeckCardEntry[]
	total: number
	page: number
	pageSize: number
}
```

`services/configs/deck.config.ts` — `listCards` return type becomes `DeckCardsResult`; add:

```ts
listCardTags: endpoint<void, string[]>({
	url: ({ deckId }) => `/api/decks/${deckId}/cards/tags`,
	method: getData,
	defaultErrorMessage: 'Failed to load tags',
}),
```

### 4.2 Shared debounce hook

New `hooks/use-debounced-search-input.ts`:

```ts
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
```

`ExplorePage` refactors its inline `setTimeout` debounce to use this hook (same behavior, less duplicated logic now that two more pages need it). Each page keeps its own `pushParams` (URL assembly), since the other params differ per page (`tag`+`page` vs `sort`+`page`).

### 4.3 `DeckDetailPage` (`decks/[deckId]/page.tsx`)

- Adopts `useSearchParams`/`useRouter`/`usePathname` for `q` and `page` (new — this page currently has no URL state at all). `selectedTag` stays local `useState` (unchanged), but changing it resets `page` to 1.
- New constant `DECK_CARDS_PAGE_SIZE = 10` in `lib/anki/constants.ts`.
- Fetch: `deckApi.listCards({ pathParams: { deckId }, queryParams: { q, tag: selectedTag ?? undefined, page, pageSize: DECK_CARDS_PAGE_SIZE }, silent: true })` → `DeckCardsResult`.
- Tags for `TagFilter` come from a separate `deckApi.listCardTags({ pathParams: { deckId }, silent: true })` call (replaces today's `collectTags(unfilteredEntries)` derived from a second full `listCards` call).
- New search `Input` (with `Search` icon, same visual treatment as `/explore`) above the entry list; new `Pagination` block below it, same building blocks (`buildPageList`, etc.) as `/explore`/words-table already use.
- Empty query → `q` omitted from the request → same results as today (page 1 of the deck's cards, tag-filtered if a tag is selected).

### 4.4 `WordsTablePage` (`decks/[deckId]/words/page.tsx`)

- Add the same search `Input` next to the existing Swap/Sort buttons; `q` in the URL, debounced via the shared hook.
- Fetch becomes `deckApi.listCards({ pathParams: { deckId }, queryParams: { q, sort, page, pageSize: WORDS_PAGE_SIZE }, silent: true })`.
- Remove the client-side `ordered` (`useMemo` sort) and the manual `.slice()` — `entries`/`total`/`page` now come straight from the response; existing `Pagination` UI wiring (`buildPageList`, `goToPage`) stays, just driven by server `total` instead of `ordered.length`.
- `toggleSort` keeps pushing `sort` into the URL exactly as today; the backend now honors it instead of the client re-sorting.

### 4.5 i18n

Add `words.searchPlaceholder` (e.g. "Search words..." / "Пошук слів...") to `en.json`/`uk.json`, reused by both pages (same underlying concept — searching the deck's cards).

## 5. Edge cases

- Empty/whitespace-only `q` → treated as no search (same as omitted), full paginated list as today.
- `q` longer than 100 chars is truncated server-side (matches `/explore`'s existing behavior for deck search).
- Regex special characters in `q` are escaped before building the Mongo regex (reusing the same `escapeRegExp` as deck search) — prevents malformed/expensive regexes from user input.
- Deck visibility/auth checks (`assertCanAccessDeck`) are unchanged and still run before any card query.
- Changing the tag filter or the search input both reset `page` to 1.
