'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { MoreVertical, Pencil, Play, Trash2 } from 'lucide-react'
import {
	Card,
	CardAction,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
}

export function DeckCard({ deck, onChanged }: DeckCardProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [deleting, setDeleting] = useState(false)

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
						<DropdownMenuContent
							align="end"
							className="w-52 max-w-[calc(100vw-1.5rem)]"
						>
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
				<div className="mt-3">
					<VisibilityBadge visibility={deck.visibility} />
				</div>
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

			<DeckFormDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				deck={deck}
				onSuccess={onChanged}
			/>

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
		</Card>
	)
}
