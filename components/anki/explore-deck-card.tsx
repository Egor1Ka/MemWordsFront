'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { BookOpen, Check, Plus, Users } from 'lucide-react'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { deckApi } from '@/services'
import type { ExploreDeckDTO } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

interface ExploreDeckCardProps {
	deck: ExploreDeckDTO
	onSubscriptionChange: (deckId: string, subscribed: boolean) => void
}

export function ExploreDeckCard({
	deck,
	onSubscriptionChange,
}: ExploreDeckCardProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [pending, setPending] = useState(false)

	const authorName = deck.ownerName ?? '—'
	const authorInitial = authorName.charAt(0).toUpperCase()

	const subscribe = async () => {
		await deckApi.subscribe({ pathParams: { deckId: deck.id }, silent: true })
		onSubscriptionChange(deck.id, true)
		toast.success(t('explore.subscribed'))
	}

	const unsubscribe = async () => {
		await deckApi.unsubscribe({ pathParams: { deckId: deck.id }, silent: true })
		onSubscriptionChange(deck.id, false)
		toast.success(t('explore.unsubscribed'))
	}

	const handleToggle = async () => {
		setPending(true)
		try {
			await (deck.isSubscribed ? unsubscribe() : subscribe())
		} catch (error) {
			notifyApiError(error)
		} finally {
			setPending(false)
		}
	}

	const renderActionIcon = () => {
		if (pending) return <Spinner />
		return deck.isSubscribed ? <Check /> : <Plus />
	}

	const renderAction = () => {
		if (deck.isOwner) {
			return (
				<span className="text-muted-foreground text-xs">
					{t('explore.yourDeck')}
				</span>
			)
		}
		return (
			<Button
				size="sm"
				variant={deck.isSubscribed ? 'outline' : 'default'}
				onClick={handleToggle}
				disabled={pending}
			>
				{renderActionIcon()}
				{deck.isSubscribed ? t('explore.added') : t('explore.add')}
			</Button>
		)
	}

	return (
		<Card className="fantasy-card-hover flex flex-col">
			<CardHeader>
				<CardTitle className="truncate">
					<Link href={`/decks/${deck.id}`} className="hover:underline">
						{deck.name}
					</Link>
				</CardTitle>
				<div className="flex min-w-0 items-center gap-2 pt-1">
					<Avatar size="sm">
						<AvatarImage
							src={deck.ownerAvatar ?? undefined}
							alt={authorName}
							referrerPolicy="no-referrer"
						/>
						<AvatarFallback>{authorInitial}</AvatarFallback>
					</Avatar>
					<span className="text-muted-foreground truncate text-xs">
						{t('explore.by', { name: authorName })}
					</span>
				</div>
			</CardHeader>

			<CardContent className="flex-1">
				{deck.description ? (
					<p className="text-muted-foreground line-clamp-3 text-sm">
						{deck.description}
					</p>
				) : (
					<p className="text-muted-foreground/70 text-sm italic">
						{t('deck.noDescription')}
					</p>
				)}
			</CardContent>

			<CardFooter className="flex-wrap justify-between gap-3">
				<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
					<span className="inline-flex items-center gap-1">
						<BookOpen className="size-3.5" />
						{t('deck.cardCount', { count: deck.cardCount })}
					</span>
					<span className="inline-flex items-center gap-1">
						<Users className="size-3.5" />
						{t('explore.subscribers', { count: deck.subscriberCount })}
					</span>
				</div>
				{renderAction()}
			</CardFooter>
		</Card>
	)
}
