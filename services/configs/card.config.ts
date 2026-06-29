import { getData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { CardDTO, UpdateCardBody, DeleteCardResult } from './anki.types'

// Card content is shared across decks (a card knows nothing about decks).
const cardApiConfig = {
	getById: endpoint<void, CardDTO>({
		url: ({ cardId }) => `/api/cards/${cardId}`,
		method: getData,
		defaultErrorMessage: 'Failed to load card',
	}),

	update: endpoint<UpdateCardBody, CardDTO>({
		url: ({ cardId }) => `/api/cards/${cardId}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update card',
	}),

	remove: endpoint<void, DeleteCardResult>({
		url: ({ cardId }) => `/api/cards/${cardId}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete card',
	}),
}

export default cardApiConfig
