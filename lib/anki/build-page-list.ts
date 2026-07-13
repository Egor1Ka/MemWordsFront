// Compact page list with ellipsis: 1 … current-1 current current+1 … total
const buildPageList = (current: number, total: number): Array<number | 'gap'> => {
	const wanted = [1, total, current - 1, current, current + 1]
	const inRange = (page: number) => page >= 1 && page <= total
	const unique = Array.from(new Set(wanted.filter(inRange))).sort(
		(a, b) => a - b,
	)
	const withGap = (page: number, index: number): Array<number | 'gap'> => {
		const previous = unique[index - 1]
		const hasGap = index > 0 && page - previous > 1
		return hasGap ? ['gap', page] : [page]
	}
	return unique.flatMap(withGap)
}

export { buildPageList }
