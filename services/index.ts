export { ApiError } from './api/api-error'
export { request } from './api/request'
export {
	getData,
	postData,
	putData,
	patchData,
	deleteData,
} from './api/methods'
export { createApiMethods } from './api/create-api-methods'
export { endpoint } from './api/types'
export { createAuthRefreshInterceptor } from './api/interceptors/with-auth-refresh'
export {
	createToastInterceptor,
	getStatusI18nKey,
	STATUS_TO_I18N_KEY,
} from './api/interceptors/with-toast'
export { setServerErrors } from './api/set-server-errors'
export type {
	UrlFunction,
	RequestConfig,
	BeforeRequest,
	AfterResponse,
	OnError,
	Interceptors,
	MethodParams,
	MethodParamsWithBody,
	EndpointConfig,
	MappedApiMethods,
	ApiErrorResponseBody,
} from './api/types'
import { createApiMethods } from './api/create-api-methods'
import { createAuthRefreshInterceptor } from './api/interceptors/with-auth-refresh'
import { createToastInterceptor } from './api/interceptors/with-toast'
import authApiConfig from './configs/auth.config'
import userApiConfig from './configs/user.config'
import deckApiConfig from './configs/deck.config'
import cardApiConfig from './configs/card.config'
import reviewApiConfig from './configs/review.config'
import mediaApiConfig from './configs/media.config'

const defaultInterceptors = {
	interceptors: {
		onError: [
			createAuthRefreshInterceptor('/api/auth/refresh', '/login'),
			createToastInterceptor(),
		],
	},
}

export const authApi = createApiMethods(authApiConfig)
export const userApi = createApiMethods(userApiConfig, defaultInterceptors)
export const deckApi = createApiMethods(deckApiConfig, defaultInterceptors)
export const cardApi = createApiMethods(cardApiConfig, defaultInterceptors)
export const reviewApi = createApiMethods(reviewApiConfig, defaultInterceptors)
export const mediaApi = createApiMethods(mediaApiConfig, defaultInterceptors)
export type { User, UpdateUserBody } from './configs/user.config'
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
} from './configs/anki.types'
export type { UploadImageResult } from './configs/media.config'
