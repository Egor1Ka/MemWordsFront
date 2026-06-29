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
import type { DeckDTO } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

export default function DecksPage() {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [decks, setDecks] = useState<DeckDTO[]>([])
	const [loading, setLoading] = useState(true)
	const [createOpen, setCreateOpen] = useState(false)

	const fetchDecks = useCallback(async () => {
		try {
			const result = await deckApi.list({ silent: true })
			setDecks(result)
		} catch (error) {
			notifyApiError(error)
		} finally {
			setLoading(false)
		}
	}, [notifyApiError])

	useEffect(() => {
		fetchDecks()
	}, [fetchDecks])

	const renderDeck = (deck: DeckDTO) => (
		<DeckCard key={deck.id} deck={deck} onChanged={fetchDecks} />
	)

	const renderSkeleton = (key: number) => (
		<Skeleton key={key} className="h-52 rounded-xl" />
	)

	return (
		<div className="mx-auto max-w-6xl p-4 sm:p-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="min-w-0">
					<h1 className="text-xl font-semibold sm:text-2xl">
						{t('decks.title')}
					</h1>
					<p className="text-muted-foreground text-sm">{t('decks.subtitle')}</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus />
					{t('decks.create')}
				</Button>
			</div>

			{loading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2, 3, 4, 5].map(renderSkeleton)}
				</div>
			) : decks.length === 0 ? (
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="default">
							<RuneCircle className="size-20 animate-float-slow" />
						</EmptyMedia>
						<EmptyTitle>{t('decks.emptyTitle')}</EmptyTitle>
						<EmptyDescription>{t('decks.emptyDescription')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={() => setCreateOpen(true)}>
							<Plus />
							{t('decks.create')}
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{decks.map(renderDeck)}
				</div>
			)}

			<DeckFormDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSuccess={fetchDecks}
			/>
		</div>
	)
}
