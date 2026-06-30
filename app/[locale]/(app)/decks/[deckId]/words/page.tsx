'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
	ArrowDownWideNarrow,
	ArrowLeft,
	ArrowLeftRight,
	ArrowUpNarrowWide,
	ChevronLeft,
	ChevronRight,
	Inbox,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from '@/components/ui/pagination'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { RevealText } from '@/components/anki/reveal-text'
import { deckApi } from '@/services'
import type { DeckCardEntry, DeckDTO } from '@/services'
import { WORDS_PAGE_SIZE } from '@/lib/anki/constants'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

type SortOrder = 'new' | 'old'

// Per-deck localStorage key remembering whether the word/translation columns are
// swapped (so each deck keeps its own orientation across visits).
const SWAP_STORAGE_PREFIX = 'memwords:words-swap:'

const addedAtMs = (entry: DeckCardEntry): number =>
	new Date(entry.addedAt).getTime()

const newestFirst = (a: DeckCardEntry, b: DeckCardEntry): number =>
	addedAtMs(b) - addedAtMs(a)

const oldestFirst = (a: DeckCardEntry, b: DeckCardEntry): number =>
	addedAtMs(a) - addedAtMs(b)

// Compact page list with ellipsis: 1 … current-1 current current+1 … total
const buildPageList = (current: number, total: number): Array<number | 'gap'> => {
	const wanted = [1, total, current - 1, current, current + 1]
	const inRange = (page: number) => page >= 1 && page <= total
	const unique = Array.from(new Set(wanted.filter(inRange))).sort(
		(a, b) => a - b,
	)
	return unique.flatMap((page, index) => {
		const previous = unique[index - 1]
		const hasGap = index > 0 && page - previous > 1
		return hasGap ? ['gap' as const, page] : [page]
	})
}

export default function WordsTablePage() {
	const { deckId } = useParams<{ deckId: string }>()
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()

	const [deck, setDeck] = useState<DeckDTO | null>(null)
	const [entries, setEntries] = useState<DeckCardEntry[]>([])
	const [loading, setLoading] = useState(true)
	const [swapped, setSwapped] = useState(false)

	const sort: SortOrder = searchParams.get('sort') === 'old' ? 'old' : 'new'
	const requestedPage = Math.max(1, Number(searchParams.get('page')) || 1)
	const swapStorageKey = `${SWAP_STORAGE_PREFIX}${deckId}`

	// Read the saved orientation after mount (localStorage is client-only).
	useEffect(() => {
		setSwapped(window.localStorage.getItem(swapStorageKey) === '1')
	}, [swapStorageKey])

	const toggleSwap = () => {
		const next = !swapped
		window.localStorage.setItem(swapStorageKey, next ? '1' : '0')
		setSwapped(next)
	}

	const firstSide = (entry: DeckCardEntry) =>
		swapped ? entry.back : entry.front
	const secondSide = (entry: DeckCardEntry) =>
		swapped ? entry.front : entry.back

	useEffect(() => {
		const load = async () => {
			try {
				const [deckResult, cards] = await Promise.all([
					deckApi
						.getById({ pathParams: { deckId }, silent: true })
						.catch(() => null),
					deckApi.listCards({ pathParams: { deckId }, silent: true }),
				])
				setDeck(deckResult)
				setEntries(cards)
			} catch (error) {
				notifyApiError(error)
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [deckId, notifyApiError])

	const ordered = useMemo(() => {
		const compare = sort === 'new' ? newestFirst : oldestFirst
		return [...entries].sort(compare)
	}, [entries, sort])

	const total = ordered.length
	const totalPages = Math.max(1, Math.ceil(total / WORDS_PAGE_SIZE))
	const page = Math.min(requestedPage, totalPages)
	const pageItems = ordered.slice(
		(page - 1) * WORDS_PAGE_SIZE,
		page * WORDS_PAGE_SIZE,
	)

	const pushParams = useCallback(
		(next: { page?: number; sort?: SortOrder }) => {
			const params = new URLSearchParams(searchParams.toString())
			if (next.sort) params.set('sort', next.sort)
			if (next.page) params.set('page', String(next.page))
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams],
	)

	const goToPage = (target: number) => pushParams({ page: target })
	const goToPageHandler = (target: number) => () => goToPage(target)
	const toggleSort = () =>
		pushParams({ sort: sort === 'new' ? 'old' : 'new', page: 1 })

	const renderTagBadge = (tag: string) => (
		<Badge key={tag} variant="outline" className="text-xs">
			{tag}
		</Badge>
	)

	const renderRow = (entry: DeckCardEntry, index: number) => (
		<TableRow key={entry.id}>
			<TableCell className="text-muted-foreground tabular-nums">
				{(page - 1) * WORDS_PAGE_SIZE + index + 1}
			</TableCell>
			<TableCell className="font-medium">{firstSide(entry).text}</TableCell>
			<TableCell>
				<RevealText text={secondSide(entry).text} />
			</TableCell>
			<TableCell className="hidden sm:table-cell">
				<div className="flex flex-wrap gap-1">
					{entry.tags.map(renderTagBadge)}
				</div>
			</TableCell>
		</TableRow>
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

	const sortLabel = sort === 'new' ? t('words.sortNewest') : t('words.sortOldest')
	const SortIcon = sort === 'new' ? ArrowDownWideNarrow : ArrowUpNarrowWide

	return (
		<div className="space-y-5">
			<Link
				href={`/decks/${deckId}`}
				className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
			>
				<ArrowLeft className="size-4" />
				{t('study.backToDeck')}
			</Link>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">
						{deck ? deck.name : t('words.title')}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t('deck.cardCount', { count: total })}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant={swapped ? 'default' : 'outline'}
						onClick={toggleSwap}
					>
						<ArrowLeftRight />
						{t('words.swap')}
					</Button>
					<Button variant="outline" onClick={toggleSort}>
						<SortIcon />
						{sortLabel}
					</Button>
				</div>
			</div>

			{loading ? (
				<div className="space-y-2">
					<Skeleton className="h-10 rounded-lg" />
					<Skeleton className="h-10 rounded-lg" />
					<Skeleton className="h-10 rounded-lg" />
				</div>
			) : total === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>{t('words.empty')}</EmptyTitle>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="overflow-x-auto rounded-xl border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">#</TableHead>
									<TableHead>
										{swapped ? t('words.translation') : t('words.word')}
									</TableHead>
									<TableHead>
										{swapped ? t('words.word') : t('words.translation')}
									</TableHead>
									<TableHead className="hidden sm:table-cell">
										{t('words.tags')}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>{pageItems.map(renderRow)}</TableBody>
						</Table>
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
										<span className="hidden sm:block">{t('words.prev')}</span>
									</Button>
								</PaginationItem>
								{buildPageList(page, totalPages).map(renderPageItem)}
								<PaginationItem>
									<Button
										variant="ghost"
										onClick={goToPageHandler(page + 1)}
										disabled={page >= totalPages}
									>
										<span className="hidden sm:block">{t('words.next')}</span>
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
