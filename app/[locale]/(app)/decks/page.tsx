'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RuneCircle } from '@/components/anki/fantasy-icons'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { DeckCard } from '@/components/anki/deck-card'
import { DeckFormDialog } from '@/components/anki/deck-form-dialog'
import { deckApi } from '@/services'
import type { DeckDTO, SavedDeckDTO } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

// One library list mixes the user's own decks with the decks they saved
// (subscribed to). A saved deck is marked with the author's avatar.
interface LibraryEntry {
	deck: DeckDTO
	saved: boolean
	ownerName: string | null
	ownerAvatar: string | null
	sortAt: number
}

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5]

const parseTime = (value: string | null | undefined): number => {
	if (!value) return 0
	const ms = Date.parse(value)
	return Number.isNaN(ms) ? 0 : ms
}

const toOwnedEntry = (deck: DeckDTO): LibraryEntry => ({
	deck,
	saved: false,
	ownerName: null,
	ownerAvatar: null,
	sortAt: parseTime(deck.updatedAt),
})

// A saved deck arrives as SavedDeckDTO; normalize it to the DeckDTO shape the
// card needs (its edit/delete actions are hidden anyway).
const savedToDeckDTO = (saved: SavedDeckDTO): DeckDTO => ({
	id: saved.id,
	ownerId: saved.ownerId ?? '',
	name: saved.name,
	description: saved.description,
	visibility: saved.visibility,
	createdAt: saved.createdAt ?? '',
	updatedAt: saved.createdAt ?? '',
	cardCount: saved.cardCount,
})

const toSavedEntry = (saved: SavedDeckDTO): LibraryEntry => ({
	deck: savedToDeckDTO(saved),
	saved: true,
	ownerName: saved.ownerName,
	ownerAvatar: saved.ownerAvatar,
	sortAt: parseTime(saved.subscribedAt ?? saved.createdAt),
})

const bySortAtDesc = (a: LibraryEntry, b: LibraryEntry): number =>
	b.sortAt - a.sortAt

const mergeLibrary = (
	owned: DeckDTO[],
	saved: SavedDeckDTO[],
): LibraryEntry[] =>
	[...owned.map(toOwnedEntry), ...saved.map(toSavedEntry)].sort(bySortAtDesc)

export default function DecksPage() {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [entries, setEntries] = useState<LibraryEntry[]>([])
	const [loading, setLoading] = useState(true)
	const [createOpen, setCreateOpen] = useState(false)

	const fetchLibrary = useCallback(async () => {
		try {
			const [owned, saved] = await Promise.all([
				deckApi.list({ silent: true }),
				deckApi.listSaved({ silent: true }),
			])
			setEntries(mergeLibrary(owned, saved))
		} catch (error) {
			notifyApiError(error)
		} finally {
			setLoading(false)
		}
	}, [notifyApiError])

	useEffect(() => {
		fetchLibrary()
	}, [fetchLibrary])

	const openCreate = () => setCreateOpen(true)

	const renderEntry = (entry: LibraryEntry) => (
		<DeckCard
			key={entry.deck.id}
			deck={entry.deck}
			onChanged={fetchLibrary}
			saved={entry.saved}
			ownerName={entry.ownerName}
			ownerAvatar={entry.ownerAvatar}
		/>
	)

	const renderSkeleton = (key: number) => (
		<Skeleton key={key} className="h-52 rounded-xl" />
	)

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="min-w-0">
					<h1 className="text-xl font-semibold sm:text-2xl">
						{t('decks.title')}
					</h1>
					<p className="text-muted-foreground text-sm">{t('decks.subtitle')}</p>
				</div>
				<Button onClick={openCreate}>
					<Plus />
					{t('decks.create')}
				</Button>
			</div>

			{loading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{SKELETON_KEYS.map(renderSkeleton)}
				</div>
			) : entries.length === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="default">
							<RuneCircle className="size-20 animate-float-slow" />
						</EmptyMedia>
						<EmptyTitle>{t('decks.emptyTitle')}</EmptyTitle>
						<EmptyDescription>{t('decks.emptyDescription')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={openCreate}>
							<Plus />
							{t('decks.create')}
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{entries.map(renderEntry)}
				</div>
			)}

			<DeckFormDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSuccess={fetchLibrary}
			/>
		</div>
	)
}
