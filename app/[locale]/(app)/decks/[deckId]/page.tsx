'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Inbox, Play, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { VisibilityBadge } from '@/components/anki/visibility-badge'
import { TagFilter } from '@/components/anki/tag-filter'
import { QuickAddCard } from '@/components/anki/quick-add-card'
import { DeckCardEntryItem } from '@/components/anki/deck-card-entry-item'
import { deckApi } from '@/services'
import type { DeckCardEntry, DeckDTO } from '@/services'
import { isApiErrorWithStatus, useApiErrorToast } from '@/lib/anki/use-api-error'

const collectTags = (entries: DeckCardEntry[]): string[] => {
	const all = entries.flatMap((entry) => entry.tags)
	return Array.from(new Set(all)).sort()
}

export default function DeckDetailPage() {
	const { deckId } = useParams<{ deckId: string }>()
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()

	const [deck, setDeck] = useState<DeckDTO | null>(null)
	const [entries, setEntries] = useState<DeckCardEntry[]>([])
	const [allTags, setAllTags] = useState<string[]>([])
	const [selectedTag, setSelectedTag] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [deckMissing, setDeckMissing] = useState(false)

	const refreshDeckMeta = useCallback(async () => {
		try {
			const [deckResult, unfiltered] = await Promise.all([
				deckApi.getById({ pathParams: { deckId }, silent: true }),
				deckApi.listCards({ pathParams: { deckId }, silent: true }),
			])
			setDeck(deckResult)
			setAllTags(collectTags(unfiltered))
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
				queryParams: { tag: selectedTag ?? undefined },
				silent: true,
			})
			setEntries(result)
		} catch (error) {
			notifyApiError(error)
		}
	}, [deckId, selectedTag, notifyApiError])

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

	const renderEntry = (entry: DeckCardEntry) => (
		<DeckCardEntryItem
			key={entry.id}
			deckId={deckId}
			card={entry}
			onChanged={handleChanged}
		/>
	)

	if (deckMissing) {
		return (
			<div className="mx-auto max-w-5xl p-6">
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
			<div className="mx-auto max-w-5xl space-y-6 p-6">
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

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
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
					{deck.description && (
						<p className="text-muted-foreground max-w-prose text-sm">
							{deck.description}
						</p>
					)}
					<p className="text-muted-foreground text-sm">
						{t('deck.cardCount', { count: deck.cardCount ?? entries.length })}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						render={<Link href={`/decks/${deckId}/words`} />}
					>
						<Table2 />
						{t('words.link')}
					</Button>
					<Button
						render={<Link href={`/decks/${deckId}/study`} />}
					>
						<Play />
						{t('study.start')}
					</Button>
				</div>
			</div>

			<QuickAddCard deckId={deckId} onAdded={handleChanged} />

			{allTags.length > 0 && (
				<TagFilter
					tags={allTags}
					selected={selectedTag}
					onSelect={setSelectedTag}
				/>
			)}

			{entries.length === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Inbox />
						</EmptyMedia>
						<EmptyTitle>
							{selectedTag ? t('deck.noTaggedCards') : t('deck.noCardsTitle')}
						</EmptyTitle>
						<EmptyDescription>
							{selectedTag
								? t('deck.noTaggedCardsDescription', { tag: selectedTag })
								: t('deck.noCardsDescription')}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="space-y-3">{entries.map(renderEntry)}</div>
			)}
		</div>
	)
}
