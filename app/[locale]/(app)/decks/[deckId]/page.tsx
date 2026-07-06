'use client'

import Link from 'next/link'
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
	ArrowLeft,
	Check,
	ChevronLeft,
	ChevronRight,
	Inbox,
	Play,
	Plus,
	Search,
	Table2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from '@/components/ui/pagination'
import { VisibilityBadge } from '@/components/anki/visibility-badge'
import { TagFilter } from '@/components/anki/tag-filter'
import { QuickAddCard } from '@/components/anki/quick-add-card'
import { DeckCardEntryItem } from '@/components/anki/deck-card-entry-item'
import { useDebouncedSearchInput } from '@/hooks/use-debounced-search-input'
import { buildPageList } from '@/lib/anki/build-page-list'
import { deckApi } from '@/services'
import type { DeckCardEntry, DeckDTO } from '@/services'
import {
	DECK_CARDS_PAGE_SIZE,
	EXPLORE_SEARCH_DEBOUNCE_MS,
} from '@/lib/anki/constants'
import { isApiErrorWithStatus, useApiErrorToast } from '@/lib/anki/use-api-error'
import { useUser } from '@/lib/auth/user-provider'

export default function DeckDetailPage() {
	const { deckId } = useParams<{ deckId: string }>()
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const user = useUser()

	const q = searchParams.get('q') ?? ''
	const page = Math.max(1, Number(searchParams.get('page')) || 1)

	const [deck, setDeck] = useState<DeckDTO | null>(null)
	const [entries, setEntries] = useState<DeckCardEntry[]>([])
	const [total, setTotal] = useState(0)
	const [allTags, setAllTags] = useState<string[]>([])
	const [selectedTag, setSelectedTag] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [deckMissing, setDeckMissing] = useState(false)
	const [subscribed, setSubscribed] = useState(false)
	const [subPending, setSubPending] = useState(false)

	const isOwner = deck ? (deck.isOwner ?? deck.ownerId === user.id) : false

	const pushParams = useCallback(
		(next: { q?: string; page?: number }) => {
			const params = new URLSearchParams(searchParams.toString())
			if (next.q !== undefined) {
				if (next.q) params.set('q', next.q)
				else params.delete('q')
			}
			if (next.page) params.set('page', String(next.page))
			router.replace(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams],
	)

	const [searchInput, setSearchInput] = useDebouncedSearchInput(
		q,
		EXPLORE_SEARCH_DEBOUNCE_MS,
		useCallback((next: string) => pushParams({ q: next, page: 1 }), [pushParams]),
	)

	const refreshDeckMeta = useCallback(async () => {
		try {
			const [deckResult, tags] = await Promise.all([
				deckApi.getById({ pathParams: { deckId }, silent: true }),
				deckApi.listCardTags({ pathParams: { deckId }, silent: true }),
			])
			setDeck(deckResult)
			setSubscribed(!!deckResult.isSubscribed)
			setAllTags(tags)
		} catch (error) {
			if (isApiErrorWithStatus(error, 404)) {
				setDeckMissing(true)
				return
			}
			notifyApiError(error)
		}
	}, [deckId, notifyApiError])

	const refreshEntries = useCallback(async () => {
		try {
			const result = await deckApi.listCards({
				pathParams: { deckId },
				queryParams: {
					q: q || undefined,
					tag: selectedTag ?? undefined,
					page,
					pageSize: DECK_CARDS_PAGE_SIZE,
				},
				silent: true,
			})
			setEntries(result.items)
			setTotal(result.total)
		} catch (error) {
			notifyApiError(error)
		}
	}, [deckId, q, selectedTag, page, notifyApiError])

	useEffect(() => {
		const run = async () => {
			await refreshDeckMeta()
		}
		run()
	}, [refreshDeckMeta])

	useEffect(() => {
		const run = async () => {
			await refreshEntries()
			setLoading(false)
		}
		run()
	}, [refreshEntries])

	const handleChanged = useCallback(() => {
		refreshDeckMeta()
		refreshEntries()
	}, [refreshDeckMeta, refreshEntries])

	const handleSelectTag = (tag: string | null) => {
		setSelectedTag(tag)
		pushParams({ page: 1 })
	}

	const subscribe = async () => {
		await deckApi.subscribe({ pathParams: { deckId }, silent: true })
		setSubscribed(true)
		toast.success(t('explore.subscribed'))
	}

	const unsubscribe = async () => {
		await deckApi.unsubscribe({ pathParams: { deckId }, silent: true })
		setSubscribed(false)
		toast.success(t('explore.unsubscribed'))
	}

	const handleToggleSubscribe = async () => {
		setSubPending(true)
		try {
			await (subscribed ? unsubscribe() : subscribe())
		} catch (error) {
			notifyApiError(error)
		} finally {
			setSubPending(false)
		}
	}

	const renderEntry = (entry: DeckCardEntry) => (
		<DeckCardEntryItem
			key={entry.id}
			deckId={deckId}
			card={entry}
			onChanged={handleChanged}
			readOnly={!isOwner}
		/>
	)

	const renderSubscribeIcon = () => {
		if (subPending) return <Spinner />
		return subscribed ? <Check /> : <Plus />
	}

	const totalPages = Math.max(1, Math.ceil(total / DECK_CARDS_PAGE_SIZE))
	const goToPage = (target: number) => pushParams({ page: target })
	const goToPageHandler = (target: number) => () => goToPage(target)

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

	if (deckMissing) {
		return (
			<div className="py-6">
				<Empty className="py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>{t('deck.notFoundTitle')}</EmptyTitle>
						<EmptyDescription>{t('deck.notFoundDescription')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant="outline" render={<Link href="/decks" />}>
							<ArrowLeft />
							{t('deck.backToDecks')}
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		)
	}

	if (loading || !deck) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-24" />
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-4 w-96" />
				<div className="space-y-3">
					<Skeleton className="h-20 rounded-lg" />
					<Skeleton className="h-20 rounded-lg" />
					<Skeleton className="h-20 rounded-lg" />
				</div>
			</div>
		)
	}

	// `deck` is narrowed to non-null below the guard above, so no `?.` is needed.
	const renderEmptyTitle = () => {
		if (q) return t('deck.noSearchResultsTitle')
		if (selectedTag) return t('deck.noTaggedCards')
		return t('deck.noCardsTitle')
	}

	const renderEmptyDescription = () => {
		if (q) return t('deck.noSearchResultsDescription')
		if (selectedTag) return t('deck.noTaggedCardsDescription', { tag: selectedTag })
		if (isOwner) return t('deck.noCardsDescription')
		return t('deck.readonlyHint', { name: deck.ownerName ?? '' })
	}

	return (
		<div className="space-y-6">
			<Link
				href="/decks"
				className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
			>
				<ArrowLeft className="size-4" />
				{t('deck.backToDecks')}
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 space-y-2">
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-xl font-semibold break-words sm:text-2xl">
							{deck.name}
						</h1>
						<VisibilityBadge visibility={deck.visibility} />
					</div>
					{!isOwner && deck.ownerName && (
						<p className="text-muted-foreground text-sm">
							{t('deck.by', { name: deck.ownerName })}
						</p>
					)}
					{deck.description && (
						<p className="text-muted-foreground max-w-prose text-sm">
							{deck.description}
						</p>
					)}
					<p className="text-muted-foreground text-sm">
						{t('deck.cardCount', { count: deck.cardCount ?? total })}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{!isOwner && (
						<Button
							variant={subscribed ? 'outline' : 'secondary'}
							onClick={handleToggleSubscribe}
							disabled={subPending}
						>
							{renderSubscribeIcon()}
							{subscribed ? t('deck.unsubscribe') : t('deck.subscribe')}
						</Button>
					)}
					<Button
						variant="outline"
						render={<Link href={`/decks/${deckId}/words`} />}
					>
						<Table2 />
						{t('words.link')}
					</Button>
					<Button render={<Link href={`/decks/${deckId}/study`} />}>
						<Play />
						{t('study.start')}
					</Button>
				</div>
			</div>

			{isOwner && <QuickAddCard deckId={deckId} onAdded={handleChanged} />}

			<div className="relative min-w-0">
				<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder={t('words.searchPlaceholder')}
					className="pl-9"
					aria-label={t('words.searchPlaceholder')}
				/>
			</div>

			{allTags.length > 0 && (
				<TagFilter
					tags={allTags}
					selected={selectedTag}
					onSelect={handleSelectTag}
				/>
			)}

			{entries.length === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>{renderEmptyTitle()}</EmptyTitle>
						<EmptyDescription>{renderEmptyDescription()}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="space-y-3">{entries.map(renderEntry)}</div>

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
