import type { Rating, Visibility } from '@/services'

// Max cards pulled into a single study session (due first, then new).
const STUDY_DAILY_LIMIT = 20

// Rows per page in the words table.
const WORDS_PAGE_SIZE = 10

// Deck cards per page on the Explore page (server-side pagination).
const EXPLORE_PAGE_SIZE = 12

// Sort options for the Explore page.
type ExploreSortOption = 'new' | 'popular' | 'name'
const EXPLORE_SORTS: ExploreSortOption[] = ['new', 'popular', 'name']

// Debounce for the Explore search input, in milliseconds.
const EXPLORE_SEARCH_DEBOUNCE_MS = 350

// Visibility options for deck forms and badges.
const VISIBILITIES: Visibility[] = ['private', 'public', 'unlisted']

interface RatingOption {
	rating: Rating
	// i18n key under the `anki.study.ratings` namespace
	key: 'again' | 'hard' | 'good' | 'easy'
}

// SM-2 answer buttons. 0 = Again, 1 = Hard, 2 = Good, 3 = Easy.
const RATING_OPTIONS: RatingOption[] = [
	{ rating: 0, key: 'again' },
	{ rating: 1, key: 'hard' },
	{ rating: 2, key: 'good' },
	{ rating: 3, key: 'easy' },
]

export {
	STUDY_DAILY_LIMIT,
	WORDS_PAGE_SIZE,
	EXPLORE_PAGE_SIZE,
	EXPLORE_SORTS,
	EXPLORE_SEARCH_DEBOUNCE_MS,
	VISIBILITIES,
	RATING_OPTIONS,
}
export type { RatingOption, ExploreSortOption }
