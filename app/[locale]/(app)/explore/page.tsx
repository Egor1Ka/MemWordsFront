'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Compass, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from '@/components/ui/pagination'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { ExploreDeckCard } from '@/components/anki/explore-deck-card'
import { deckApi } from '@/services'
import type { ExploreDeckDTO, ExploreResult, ExploreSort } from '@/services'
import {
	EXPLORE_PAGE_SIZE,
	EXPLORE_SORTS,
	EXPLORE_SEARCH_DEBOUNCE_MS,
} from '@/lib/anki/constants'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

const normalizeSort = (raw: string | null): ExploreSort =>
	EXPLORE_SORTS.includes(raw as ExploreSort) ? (raw as ExploreSort) : 'new'

// Compact page list with ellipsis: 1 … current-1 current current+1 … total
const buildPageList = (current: number, total: number): Array<number | 'gap'> => {
	const wanted = [1, total, current - 1, current, current + 1]
	const inRange = (page: number) => page >= 1 && page <= total
	const unique = Array.from(new Set(wanted.filter(inRange))).sort(
		(a, b) => a - b,
	)
	const withGaps = (page: number, index: number): Array<number | 'gap'> => {
		const previous = unique[index - 1]
		const hasGap = index > 0 && page - previous > 1
		return hasGap ? ['gap', page] : [page]
	}
	return unique.flatMap(withGaps)
}

// Curried, pure updaters so the optimistic toggle has no inline closures.
const toItemWithSubscription =
	(deckId: string, subscribed: boolean) =>
	(item: ExploreDeckDTO): ExploreDeckDTO => {
		if (item.id !== deckId) return item
		const delta = subscribed ? 1 : -1
		return {
			...item,
			isSubscribed: subscribed,
			subscriberCount: Math.max(0, item.subscriberCount + delta),
		}
	}

const applySubscription =
	(deckId: string, subscribed: boolean) =>
	(prev: ExploreResult | null): ExploreResult | null => {
		if (!prev) return prev
		return {
			...prev,
			items: prev.items.map(toItemWithSubscription(deckId, subscribed)),
		}
	}

export default function ExplorePage() {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()

	const q = searchParams.get('q') ?? ''
	const sort = normalizeSort(searchParams.get('sort'))
	const page = Math.max(1, Number(searchParams.get('page')) || 1)

	const [searchInput, setSearchInput] = useState(q)
	const [result, setResult] = useState<ExploreResult | null>(null)
	const [loading, setLoading] = useState(true)

	const pushParams = useCallback(
		(next: { q?: string; sort?: ExploreSort; page?: number }) => {
			const params = new URLSearchParams(searchParams.toString())
			if (next.q !== undefined) {
				if (next.q) params.set('q', next.q)
				else params.delete('q')
			}
			if (next.sort) params.set('sort', next.sort)
			if (next.page) params.set('page', String(next.page))
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams],
	)

	// Debounce the search box into the URL (resetting to page 1).
	useEffect(() => {
		const handle = setTimeout(() => {
			if (searchInput !== q) pushParams({ q: searchInput, page: 1 })
		}, EXPLORE_SEARCH_DEBOUNCE_MS)
		return () => clearTimeout(handle)
	}, [searchInput, q, pushParams])

	useEffect(() => {
		const load = async () => {
			setLoading(true)
			try {
				const res = await deckApi.explore({
					queryParams: {
						q: q || undefined,
						sort,
						page,
						pageSize: EXPLORE_PAGE_SIZE,
					},
					silent: true,
				})
				setResult(res)
			} catch (error) {
				notifyApiError(error)
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [q, sort, page, notifyApiError])

	const handleSubscriptionChange = useCallback(
		(deckId: string, subscribed: boolean) => {
			setResult(applySubscription(deckId, subscribed))
		},
		[],
	)

	const handleSortChange = (value: string | null) =>
		pushParams({ sort: normalizeSort(value), page: 1 })

	const total = result?.total ?? 0
	const totalPages = Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE))
	const items = result?.items ?? []

	const goToPage = (target: number) => pushParams({ page: target })
	const goToPageHandler = (target: number) => () => goToPage(target)

	const renderDeck = (deck: ExploreDeckDTO) => (
		<ExploreDeckCard
			key={deck.id}
			deck={deck}
			onSubscriptionChange={handleSubscriptionChange}
		/>
	)

	const renderSkeleton = (key: number) => (
		<Skeleton key={key} className="h-56 rounded-xl" />
	)

	const renderSortOption = (option: ExploreSort) => (
		<SelectItem key={option} value={option}>
			{t(`explore.sort.${option}`)}
		</SelectItem>
	)

	const renderPageItem = (item: number | 'gap', index: number) => {
		if (item === 'gap') {
			return (
				<PaginationItem key={`gap-${index}`}>
					<PaginationEllipsis />
				</PaginationItem>
			)
		}
		return (
			<PaginationItem key={item}>
				<Button
					variant={item === page ? 'outline' : 'ghost'}
					size="icon"
					onClick={goToPageHandler(item)}
					aria-current={item === page ? 'page' : undefined}
				>
					{item}
				</Button>
			</PaginationItem>
		)
	}

	const skeletonKeys = useMemo(
		() => Array.from({ length: 6 }, (_, index) => index),
		[],
	)

	return (
		<div className="space-y-6">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold sm:text-2xl">
					{t('explore.title')}
				</h1>
				<p className="text-muted-foreground text-sm">{t('explore.subtitle')}</p>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-0 flex-1">
					<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<Input
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
						placeholder={t('explore.searchPlaceholder')}
						className="pl-9"
						aria-label={t('explore.searchPlaceholder')}
					/>
				</div>
				<Select value={sort} onValueChange={handleSortChange}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>{EXPLORE_SORTS.map(renderSortOption)}</SelectContent>
				</Select>
			</div>

			{loading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{skeletonKeys.map(renderSkeleton)}
				</div>
			) : items.length === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Compass />
						</EmptyMedia>
						<EmptyTitle>{t('explore.emptyTitle')}</EmptyTitle>
						<EmptyDescription>{t('explore.emptyDescription')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{items.map(renderDeck)}
					</div>

					{totalPages > 1 && (
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<Button
										variant="ghost"
										onClick={goToPageHandler(page - 1)}
										disabled={page <= 1}
									>
										<ChevronLeft />
										<span className="hidden sm:block">{t('explore.prev')}</span>
									</Button>
								</PaginationItem>
								{buildPageList(page, totalPages).map(renderPageItem)}
								<PaginationItem>
									<Button
										variant="ghost"
										onClick={goToPageHandler(page + 1)}
										disabled={page >= totalPages}
									>
										<span className="hidden sm:block">{t('explore.next')}</span>
										<ChevronRight />
									</Button>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</>
			)}
		</div>
	)
}
