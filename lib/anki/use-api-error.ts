'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ApiError, getStatusI18nKey } from '@/services'

// Localized error toaster for Anki calls. Pair with `{ silent: true }` on the
// request so the global toast interceptor does not also fire (avoids duplicates).
// Maps the HTTP status (403/404/409/...) to an `errors.api.*` message.
//
// The returned callback is reference-stable (empty deps + a ref to the latest
// translator), so it is safe to list in useEffect/useCallback dependency arrays
// without triggering re-fetch loops.
function useApiErrorToast() {
	const t = useTranslations('errors')
	const translateRef = useRef(t)

	useEffect(() => {
		translateRef.current = t
	}, [t])

	return useCallback((error: unknown) => {
		const translate = translateRef.current
		if (error instanceof ApiError) {
			toast.error(translate(`api.${getStatusI18nKey(error.status)}`))
			return
		}
		toast.error(translate('api.unknown'))
	}, [])
}

const isApiErrorWithStatus = (error: unknown, status: number): boolean =>
	error instanceof ApiError && error.status === status

export { useApiErrorToast, isApiErrorWithStatus }
