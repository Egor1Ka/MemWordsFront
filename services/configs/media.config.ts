import { postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface UploadImageResult {
	url: string
}

// Image upload goes through the backend media service (Cloudinary) and returns
// the public URL. Body is multipart/form-data with a single "file" field.
const mediaApiConfig = {
	uploadImage: endpoint<FormData, UploadImageResult>({
		url: () => `/api/cards/images`,
		method: postData,
		defaultErrorMessage: 'Failed to upload image',
	}),
}

export default mediaApiConfig
export type { UploadImageResult }
