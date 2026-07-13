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
