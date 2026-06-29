import { getData, postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	StudyCard,
	ReviewDTO,
	ReviewBody,
	ResetReviewResult,
} from './anki.types'

// Study queue + SM-2 review progress.
const reviewApiConfig = {
	// Cards in this deck whose review is due (dueDate <= now).
	due: endpoint<void, StudyCard[]>({
		url: ({ deckId }) => `/api/decks/${deckId}/study/due`,
		method: getData,
		defaultErrorMessage: 'Failed to load due cards',
	}),

	// Cards in this deck with no review yet (review: null), ordered by when added.
	newCards: endpoint<void, StudyCard[]>({
		url: ({ deckId }) => `/api/decks/${deckId}/study/new`,
		method: getData,
		defaultErrorMessage: 'Failed to load new cards',
	}),

	// Begin studying a card (creates default progress, dueDate = now).
	start: endpoint<void, ReviewDTO>({
		url: ({ cardId }) => `/api/cards/${cardId}/review/start`,
		method: postData,
		defaultErrorMessage: 'Failed to start studying card',
	}),

	// Record an answer; recomputes via SM-2. Starts a new card implicitly.
	submit: endpoint<ReviewBody, ReviewDTO>({
		url: ({ cardId }) => `/api/cards/${cardId}/review`,
		method: postData,
		defaultErrorMessage: 'Failed to save answer',
	}),

	// Reset progress for this card.
	reset: endpoint<void, ResetReviewResult>({
		url: ({ cardId }) => `/api/cards/${cardId}/review`,
		method: deleteData,
		defaultErrorMessage: 'Failed to reset progress',
	}),
}

export default reviewApiConfig
