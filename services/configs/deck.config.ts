import {
	getData,
	postData,
	patchData,
	deleteData,
} from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	DeckDTO,
	DeckCardEntry,
	DeckCardLink,
	CreateDeckBody,
	UpdateDeckBody,
	CreateCardBody,
	LinkCardBody,
	UpdateTagsBody,
	DeleteDeckResult,
	RemoveCardFromDeckResult,
} from './anki.types'

const deckApiConfig = {
	// ── Decks ────────────────────────────────────────────────────────────────
	list: endpoint<void, DeckDTO[]>({
		url: () => `/api/decks`,
		method: getData,
		defaultErrorMessage: 'Failed to load decks',
	}),

	getById: endpoint<void, DeckDTO>({
		url: ({ deckId }) => `/api/decks/${deckId}`,
		method: getData,
		defaultErrorMessage: 'Failed to load deck',
	}),

	create: endpoint<CreateDeckBody, DeckDTO>({
		url: () => `/api/decks`,
		method: postData,
		defaultErrorMessage: 'Failed to create deck',
	}),

	update: endpoint<UpdateDeckBody, DeckDTO>({
		url: ({ deckId }) => `/api/decks/${deckId}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update deck',
	}),

	remove: endpoint<void, DeleteDeckResult>({
		url: ({ deckId }) => `/api/decks/${deckId}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete deck',
	}),

	// ── Cards inside a deck ────────────────────────────────────────────────────
	listCards: endpoint<void, DeckCardEntry[]>({
		url: ({ deckId }) => `/api/decks/${deckId}/cards`,
		method: getData,
		defaultErrorMessage: 'Failed to load cards',
	}),

	createCard: endpoint<CreateCardBody, DeckCardEntry>({
		url: ({ deckId }) => `/api/decks/${deckId}/cards`,
		method: postData,
		defaultErrorMessage: 'Failed to add card',
	}),

	linkCard: endpoint<LinkCardBody, DeckCardEntry>({
		url: ({ deckId, cardId }) => `/api/decks/${deckId}/cards/${cardId}`,
		method: postData,
		defaultErrorMessage: 'Failed to link card',
	}),

	updateCardTags: endpoint<UpdateTagsBody, DeckCardLink>({
		url: ({ deckId, cardId }) => `/api/decks/${deckId}/cards/${cardId}/tags`,
		method: patchData,
		defaultErrorMessage: 'Failed to update tags',
	}),

	removeCard: endpoint<void, RemoveCardFromDeckResult>({
		url: ({ deckId, cardId }) => `/api/decks/${deckId}/cards/${cardId}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to remove card from deck',
	}),
}

export default deckApiConfig
