'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowRight, FolderMinus, MoreVertical, Pencil, Tags, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
import { CardFormDialog } from '@/components/anki/card-form-dialog'
import { EditTagsDialog } from '@/components/anki/edit-tags-dialog'
import { cardApi, deckApi } from '@/services'
import type { CardSide, DeckCardEntry } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

type ConfirmMode = 'removeFromDeck' | 'deleteFully' | null

interface DeckCardEntryItemProps {
	deckId: string
	card: DeckCardEntry
	onChanged: () => void
}

export function DeckCardEntryItem({
	deckId,
	card,
	onChanged,
}: DeckCardEntryItemProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [editOpen, setEditOpen] = useState(false)
	const [tagsOpen, setTagsOpen] = useState(false)
	const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null)
	const [busy, setBusy] = useState(false)

	const removeFromDeck = async () => {
		await deckApi.removeCard({
			pathParams: { deckId, cardId: card.id },
			silent: true,
		})
		toast.success(t('card.removedFromDeck'))
	}

	const deleteFully = async () => {
		await cardApi.remove({ pathParams: { cardId: card.id }, silent: true })
		toast.success(t('card.deleted'))
	}

	const handleConfirm = async () => {
		setBusy(true)
		try {
			if (confirmMode === 'removeFromDeck') await removeFromDeck()
			if (confirmMode === 'deleteFully') await deleteFully()
			setConfirmMode(null)
			onChanged()
		} catch (error) {
			notifyApiError(error)
		} finally {
			setBusy(false)
		}
	}

	const renderDescription = (side: CardSide) =>
		side.description ? (
			<p className="text-muted-foreground text-xs leading-relaxed">
				{side.description}
			</p>
		) : null

	const renderImage = (url: string) => (
		<div className="border-border ring-border/40 group/img relative aspect-[4/3] w-36 shrink-0 overflow-hidden rounded-lg border ring-1 transition-shadow hover:ring-primary/60 sm:w-44">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={url}
				alt=""
				loading="lazy"
				className="size-full object-cover transition-transform duration-300 group-hover/img:scale-110"
			/>
			<div className="from-background/50 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent" />
		</div>
	)

	const hasImages = !!(card.front.imageUrl || card.back.imageUrl)
	const hasDescriptions = !!(card.front.description || card.back.description)

	const renderTag = (tag: string) => (
		<Badge key={tag} variant="outline" className="text-xs">
			{tag}
		</Badge>
	)

	const isRemoveMode = confirmMode === 'removeFromDeck'

	return (
		<div className="border-border hover:border-primary/40 hover:bg-card/40 rounded-lg border p-4 transition-colors">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center">
					{hasImages && (
						<div className="flex shrink-0 gap-2">
							{card.front.imageUrl && renderImage(card.front.imageUrl)}
							{card.back.imageUrl && renderImage(card.back.imageUrl)}
						</div>
					)}
					<div className="min-w-0 flex-1 space-y-2.5">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-medium">{card.front.text}</span>
							<ArrowRight className="text-muted-foreground size-4 shrink-0" />
							<span className="text-muted-foreground">{card.back.text}</span>
						</div>
						{hasDescriptions && (
							<div className="space-y-1">
								{renderDescription(card.front)}
								{renderDescription(card.back)}
							</div>
						)}
						{card.tags.length > 0 && (
							<div className="flex flex-wrap gap-1.5 pt-1">
								{card.tags.map(renderTag)}
							</div>
						)}
					</div>
				</div>

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
						className="w-60 max-w-[calc(100vw-1.5rem)]"
					>
						<DropdownMenuItem onClick={() => setEditOpen(true)}>
							<Pencil />
							{t('card.editContent')}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTagsOpen(true)}>
							<Tags />
							{t('card.editTags')}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setConfirmMode('removeFromDeck')}>
							<FolderMinus />
							{t('card.removeFromDeck')}
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-destructive"
							onClick={() => setConfirmMode('deleteFully')}
						>
							<Trash2 />
							{t('card.deleteFully')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<CardFormDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				deckId={deckId}
				card={card}
				onSuccess={onChanged}
			/>
			<EditTagsDialog
				open={tagsOpen}
				onOpenChange={setTagsOpen}
				deckId={deckId}
				card={card}
				onSuccess={onChanged}
			/>

			<AlertDialog
				open={confirmMode !== null}
				onOpenChange={(open) => !open && setConfirmMode(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isRemoveMode
								? t('card.removeFromDeckTitle')
								: t('card.deleteFullyTitle')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isRemoveMode
								? t('card.removeFromDeckConfirm')
								: t('card.deleteFullyConfirm')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>
							{t('actions.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirm}
							disabled={busy}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{busy ? t('actions.processing') : t('actions.confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
