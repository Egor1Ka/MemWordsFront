'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { BookmarkMinus, MoreVertical, Pencil, Play, Trash2 } from 'lucide-react'
import {
	Card,
	CardAction,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { VisibilityBadge } from '@/components/anki/visibility-badge'
import { DeckFormDialog } from '@/components/anki/deck-form-dialog'
import { deckApi } from '@/services'
import type { DeckDTO } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

interface DeckCardProps {
	deck: DeckDTO
	onChanged: () => void
	// A "saved" deck is one the user subscribed to (created by someone else). It
	// lives in the same library list but is marked with the author's avatar and
	// is read-only (no edit/delete, only "remove from my decks").
	saved?: boolean
	ownerName?: string | null
	ownerAvatar?: string | null
}

export function DeckCard({
	deck,
	onChanged,
	saved = false,
	ownerName = null,
	ownerAvatar = null,
}: DeckCardProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [removing, setRemoving] = useState(false)

	const authorName = ownerName ?? '—'
	const authorInitial = authorName.charAt(0).toUpperCase()

	const handleDelete = async () => {
		setDeleting(true)
		try {
			await deckApi.remove({ pathParams: { deckId: deck.id }, silent: true })
			toast.success(t('deck.deleted'))
			setDeleteOpen(false)
			onChanged()
		} catch (error) {
			notifyApiError(error)
		} finally {
			setDeleting(false)
		}
	}

	const handleRemoveFromSaved = async () => {
		setRemoving(true)
		try {
			await deckApi.unsubscribe({ pathParams: { deckId: deck.id }, silent: true })
			toast.success(t('explore.unsubscribed'))
			onChanged()
		} catch (error) {
			notifyApiError(error)
		} finally {
			setRemoving(false)
		}
	}

	const renderMenu = () => {
		if (saved) {
			return (
				<DropdownMenuContent
					align="end"
					className="w-56 max-w-[calc(100vw-1.5rem)]"
				>
					<DropdownMenuItem onClick={handleRemoveFromSaved} disabled={removing}>
						<BookmarkMinus />
						{t('deck.unsubscribe')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			)
		}
		return (
			<DropdownMenuContent align="end" className="w-52 max-w-[calc(100vw-1.5rem)]">
				<DropdownMenuItem onClick={() => setEditOpen(true)}>
					<Pencil />
					{t('actions.edit')}
				</DropdownMenuItem>
				<DropdownMenuItem
					className="text-destructive"
					onClick={() => setDeleteOpen(true)}
				>
					<Trash2 />
					{t('actions.delete')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		)
	}

	const renderMeta = () => {
		if (saved) {
			return (
				<div className="mt-3 flex min-w-0 items-center gap-2">
					<Avatar size="sm">
						<AvatarImage
							src={ownerAvatar ?? undefined}
							alt={authorName}
							referrerPolicy="no-referrer"
						/>
						<AvatarFallback>{authorInitial}</AvatarFallback>
					</Avatar>
					<span className="text-muted-foreground truncate text-xs">
						{t('deck.by', { name: authorName })}
					</span>
				</div>
			)
		}
		return (
			<div className="mt-3">
				<VisibilityBadge visibility={deck.visibility} />
			</div>
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
				<CardAction>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={t('actions.more')}
								/>
							}
						>
							<MoreVertical />
						</DropdownMenuTrigger>
						{renderMenu()}
					</DropdownMenu>
				</CardAction>
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
				{renderMeta()}
			</CardContent>

			<CardFooter className="justify-between">
				<span className="text-muted-foreground text-sm">
					{t('deck.cardCount', { count: deck.cardCount ?? 0 })}
				</span>
				<Button size="sm" render={<Link href={`/decks/${deck.id}/study`} />}>
					<Play />
					{t('study.start')}
				</Button>
			</CardFooter>

			{!saved && (
				<DeckFormDialog
					open={editOpen}
					onOpenChange={setEditOpen}
					deck={deck}
					onSuccess={onChanged}
				/>
			)}

			{!saved && (
				<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('deck.deleteTitle')}</AlertDialogTitle>
							<AlertDialogDescription>
								{t('deck.deleteConfirm', { name: deck.name })}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={deleting}>
								{t('actions.cancel')}
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								disabled={deleting}
								className="bg-destructive text-white hover:bg-destructive/90"
							>
								{deleting ? t('actions.deleting') : t('actions.delete')}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</Card>
	)
}
