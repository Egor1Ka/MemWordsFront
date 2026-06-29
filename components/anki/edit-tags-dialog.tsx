'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { TagInput } from '@/components/anki/tag-input'
import { deckApi } from '@/services'
import type { DeckCardEntry } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

interface EditTagsDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	deckId: string
	card: DeckCardEntry
	onSuccess: () => void
}

export function EditTagsDialog({
	open,
	onOpenChange,
	deckId,
	card,
	onSuccess,
}: EditTagsDialogProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [tags, setTags] = useState<string[]>(card.tags)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (open) setTags(card.tags)
	}, [open, card.tags])

	const handleSave = async () => {
		setSaving(true)
		try {
			await deckApi.updateCardTags({
				pathParams: { deckId, cardId: card.id },
				body: { tags },
				silent: true,
			})
			toast.success(t('card.tagsUpdated'))
			onSuccess()
			onOpenChange(false)
		} catch (error) {
			notifyApiError(error)
		} finally {
			setSaving(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('card.tagsTitle')}</DialogTitle>
					<DialogDescription>{t('card.tagsHint')}</DialogDescription>
				</DialogHeader>
				<Field>
					<FieldLabel htmlFor="edit-tags">{t('card.tags')}</FieldLabel>
					<TagInput
						id="edit-tags"
						value={tags}
						onChange={setTags}
						placeholder={t('card.tagsPlaceholder')}
					/>
				</Field>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{t('actions.cancel')}
					</Button>
					<Button type="button" onClick={handleSave} disabled={saving}>
						{saving ? t('actions.saving') : t('actions.save')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
