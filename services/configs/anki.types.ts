// Shared DTO and request-body types for the Anki vocabulary API.
// Responses are RAW (the DTO or an array) — never wrapped in { data, statusCode, status }.

type Visibility = 'private' | 'public' | 'unlisted'

type Rating = 0 | 1 | 2 | 3

interface CardSide {
	text: string
	description: string | null
	imageUrl: string | null
}

interface DeckDTO {
	id: string
	ownerId: string
	name: string
	description: string | null
	visibility: Visibility
	createdAt: string
	updatedAt: string
	cardCount?: number
	// Present on GET /decks/:id (single deck), used for the read-only view of
	// another user's public deck.
	ownerName?: string | null
	isOwner?: boolean
	isSubscribed?: boolean
}

interface CardDTO {
	id: string
	authorId: string
	front: CardSide
	back: CardSide
	createdAt: string
}

// A card as it appears inside a deck (deck card listing + create/link response).
interface DeckCardEntry {
	id: string
	authorId: string
	front: CardSide
	back: CardSide
	createdAt: string
	tags: string[]
	addedAt: string
}

// ── Discovery / subscriptions ────────────────────────────────────────────────

type ExploreSort = 'new' | 'popular' | 'name'

// Enriched deck row from /decks/explore and /decks/saved.
interface ExploreDeckDTO {
	id: string
	name: string
	description: string | null
	ownerId: string | null
	ownerName: string | null
	ownerAvatar: string | null
	visibility: Visibility
	cardCount: number
	subscriberCount: number
	createdAt: string | null
	isSubscribed: boolean
	isOwner: boolean
}

// Paginated search result. NOTE: unlike other endpoints (raw DTO/array), the
// explore endpoint intentionally returns this wrapper so pagination has a total.
interface ExploreResult {
	items: ExploreDeckDTO[]
	total: number
	page: number
	pageSize: number
	sort: ExploreSort
}

interface SavedDeckDTO extends ExploreDeckDTO {
	subscribedAt: string | null
}

interface SubscribeResult {
	deckId: string
	subscribed: boolean
}

// Returned when editing the deck-scoped tags of a link.
interface DeckCardLink {
	id: string
	deckId: string
	cardId: string
	tags: string[]
	addedAt: string
}

interface ReviewDTO {
	id: string
	userId: string
	cardId: string
	easeFactor: number
	interval: number
	repetitions: number
	dueDate: string | null
	lastReviewedAt: string | null
}

// A study queue item. review === null means a brand-new card (never studied).
interface StudyCard {
	id: string
	authorId: string
	front: CardSide
	back: CardSide
	createdAt: string
	review: ReviewDTO | null
}

// ── Request bodies ──────────────────────────────────────────────────────────

// On input, optional side fields may simply be omitted.
interface CardSideInput {
	text: string
	description?: string
	imageUrl?: string
}

interface CreateDeckBody {
	name: string
	description?: string
	visibility?: Visibility
}

interface UpdateDeckBody {
	name?: string
	description?: string
	visibility?: Visibility
}

interface CreateCardBody {
	front: CardSideInput
	back: CardSideInput
	tags?: string[]
}

interface LinkCardBody {
	tags?: string[]
}

interface UpdateTagsBody {
	tags: string[]
}

interface UpdateCardBody {
	front?: CardSideInput
	back?: CardSideInput
}

interface ReviewBody {
	rating: Rating
}

// ── Mutation result payloads ────────────────────────────────────────────────

interface DeleteDeckResult {
	id: string
	removedLinks: number
}

interface RemoveCardFromDeckResult {
	deckId: string
	cardId: string
	removed: boolean
}

interface DeleteCardResult {
	id: string
	removedLinks: number
	removedReviews: number
}

interface ResetReviewResult {
	cardId: string
	reset: boolean
}

export type {
	Visibility,
	Rating,
	CardSide,
	DeckDTO,
	CardDTO,
	DeckCardEntry,
	DeckCardLink,
	ReviewDTO,
	StudyCard,
	CardSideInput,
	CreateDeckBody,
	UpdateDeckBody,
	CreateCardBody,
	LinkCardBody,
	UpdateTagsBody,
	UpdateCardBody,
	ReviewBody,
	DeleteDeckResult,
	RemoveCardFromDeckResult,
	DeleteCardResult,
	ResetReviewResult,
	ExploreSort,
	ExploreDeckDTO,
	ExploreResult,
	SavedDeckDTO,
	SubscribeResult,
}
