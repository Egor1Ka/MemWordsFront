'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react'
import { RuneCircle } from '@/components/anki/fantasy-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
import { deckApi, reviewApi } from '@/services'
import type { CardSide, Rating, StudyCard } from '@/services'
import { RATING_OPTIONS, STUDY_DAILY_LIMIT } from '@/lib/anki/constants'
import type { RatingOption } from '@/lib/anki/constants'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

type ButtonVariant = 'destructive' | 'outline' | 'default' | 'secondary'

const RATING_VARIANT: Record<RatingOption['key'], ButtonVariant> = {
	again: 'destructive',
	hard: 'outline',
	good: 'default',
	easy: 'secondary',
}

// Queue = due cards first, then new cards, deduped, capped at the daily limit.
const buildQueue = (due: StudyCard[], fresh: StudyCard[]): StudyCard[] => {
	const dedup = (acc: StudyCard[], card: StudyCard) =>
		acc.some((existing) => existing.id === card.id) ? acc : [...acc, card]
	return [...due, ...fresh].reduce(dedup, []).slice(0, STUDY_DAILY_LIMIT)
}

function SideView({ side }: { side: CardSide }) {
	return (
		<div className="space-y-3 text-center">
			<p className="text-2xl font-semibold break-words">{side.text}</p>
			{side.description && (
				<p className="text-muted-foreground break-words">{side.description}</p>
			)}
			{side.imageUrl && (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={side.imageUrl}
					alt=""
					className="mx-auto max-h-48 rounded-lg object-contain"
				/>
			)}
		</div>
	)
}

interface StudySessionProps {
	deckId: string
}

export function StudySession({ deckId }: StudySessionProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()

	const [queue, setQueue] = useState<StudyCard[]>([])
	const [index, setIndex] = useState(0)
	const [revealed, setRevealed] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [loading, setLoading] = useState(true)
	const [deckName, setDeckName] = useState<string | null>(null)

	const current = queue[index] ?? null
	const total = queue.length
	const finished = !loading && total > 0 && index >= total
	const progress = total > 0 ? Math.round((index / total) * 100) : 0

	const loadQueue = useCallback(async () => {
		setLoading(true)
		try {
			const [due, fresh, deck] = await Promise.all([
				reviewApi.due({
					pathParams: { deckId },
					queryParams: { limit: STUDY_DAILY_LIMIT },
					silent: true,
				}),
				reviewApi.newCards({
					pathParams: { deckId },
					queryParams: { limit: STUDY_DAILY_LIMIT },
					silent: true,
				}),
				deckApi
					.getById({ pathParams: { deckId }, silent: true })
					.catch(() => null),
			])
			setDeckName(deck?.name ?? null)
			setQueue(buildQueue(due, fresh))
			setIndex(0)
			setRevealed(false)
		} catch (error) {
			notifyApiError(error)
		} finally {
			setLoading(false)
		}
	}, [deckId, notifyApiError])

	useEffect(() => {
		loadQueue()
	}, [loadQueue])

	const handleRate = useCallback(
		async (rating: Rating) => {
			if (!current || submitting) return
			setSubmitting(true)
			try {
				await reviewApi.submit({
					pathParams: { cardId: current.id },
					body: { rating },
					silent: true,
				})
				setIndex((value) => value + 1)
				setRevealed(false)
			} catch (error) {
				notifyApiError(error)
			} finally {
				setSubmitting(false)
			}
		},
		[current, submitting, notifyApiError],
	)

	// Keyboard shortcuts: Space reveals the answer, 1–4 rate it.
	useEffect(() => {
		const findOptionByKey = (key: string): RatingOption | undefined =>
			RATING_OPTIONS.find((option) => String(option.rating + 1) === key)

		const onKeyDown = (event: KeyboardEvent) => {
			if (loading || finished || !current) return
			if (!revealed && event.code === 'Space') {
				event.preventDefault()
				setRevealed(true)
				return
			}
			if (revealed) {
				const option = findOptionByKey(event.key)
				if (option) {
					event.preventDefault()
					handleRate(option.rating)
				}
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [revealed, current, loading, finished, handleRate])

	const renderRatingButton = (option: RatingOption) => (
		<Button
			key={option.key}
			variant={RATING_VARIANT[option.key]}
			disabled={submitting}
			onClick={() => handleRate(option.rating)}
			className="flex-1"
		>
			{t(`study.ratings.${option.key}`)}
		</Button>
	)

	const backToDeck = (
		<Link
			href={`/decks/${deckId}`}
			className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
		>
			<ArrowLeft className="size-4" />
			{t('study.backToDeck')}
		</Link>
	)

	if (loading) {
		return (
			<div className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
				<Skeleton className="h-6 w-40" />
				<Skeleton className="h-2 w-full" />
				<Skeleton className="h-64 rounded-xl" />
			</div>
		)
	}

	if (total === 0) {
		return (
			<div className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
				{backToDeck}
				<Empty className="border-border rounded-xl border border-dashed py-16">
					<EmptyHeader>
						<EmptyMedia variant="default">
							<RuneCircle className="size-20 animate-float-slow" />
						</EmptyMedia>
						<EmptyTitle>{t('study.emptyTitle')}</EmptyTitle>
						<EmptyDescription>{t('study.emptyDescription')}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button render={<Link href={`/decks/${deckId}`} />}>
							<Plus />
							{t('study.addCards')}
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		)
	}

	if (finished) {
		return (
			<div className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
				{backToDeck}
				<Empty className="py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CheckCircle2 className="text-primary animate-float-slow fantasy-glow" />
						</EmptyMedia>
						<EmptyTitle>{t('study.doneTitle')}</EmptyTitle>
						<EmptyDescription>
							{t('study.doneDescription', { count: total })}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent className="flex-row justify-center gap-2">
						<Button variant="outline" onClick={loadQueue}>
							{t('study.again')}
						</Button>
						<Button render={<Link href={`/decks/${deckId}`} />}>
							{t('study.backToDeck')}
						</Button>
					</EmptyContent>
				</Empty>
			</div>
		)
	}

	if (!current) return null

	return (
		<div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
			<div className="flex items-center justify-between gap-4">
				{backToDeck}
				<span className="text-muted-foreground text-sm tabular-nums">
					{t('study.progress', { done: index, total })}
				</span>
			</div>

			{deckName && <h1 className="text-xl font-semibold">{deckName}</h1>}

			<Progress value={progress} />

			<Card className="min-h-64">
				<CardContent className="flex min-h-64 flex-col items-center justify-center gap-6 py-10">
					<SideView side={current.front} />
					{revealed && (
						<>
							<div className="bg-border h-px w-full" />
							<SideView side={current.back} />
						</>
					)}
				</CardContent>
			</Card>

			{revealed ? (
				<div className="grid grid-cols-2 gap-2 sm:flex">
					{RATING_OPTIONS.map(renderRatingButton)}
				</div>
			) : (
				<Button className="w-full" size="lg" onClick={() => setRevealed(true)}>
					{submitting ? <Spinner /> : t('study.showAnswer')}
				</Button>
			)}
		</div>
	)
}
