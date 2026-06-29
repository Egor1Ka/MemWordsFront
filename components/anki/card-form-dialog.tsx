'use client'

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { TagInput } from '@/components/anki/tag-input'
import { ImageUpload } from '@/components/anki/image-upload'
import { cardApi, deckApi } from '@/services'
import type { CardSideInput, DeckCardEntry } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

const buildSchema = (t: ReturnType<typeof useTranslations>) => {
	const side = z.object({
		text: z.string().trim().min(1, t('validation.textRequired')),
		description: z.string().max(500, t('validation.descriptionMax')),
		imageUrl: z.union([z.literal(''), z.url(t('validation.invalidUrl'))]),
	})

	return z.object({
		front: side,
		back: side,
		tags: z.array(z.string()),
	})
}

type CardFormValues = z.infer<ReturnType<typeof buildSchema>>

type SideValues = CardFormValues['front']

const toSideInput = (side: SideValues): CardSideInput => ({
	text: side.text.trim(),
	description: side.description.trim() || undefined,
	imageUrl: side.imageUrl.trim() || undefined,
})

const toSideValues = (
	side: DeckCardEntry['front'] | undefined,
): SideValues => ({
	text: side?.text ?? '',
	description: side?.description ?? '',
	imageUrl: side?.imageUrl ?? '',
})

interface CardFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	deckId: string
	card?: DeckCardEntry
	onSuccess: () => void
}

export function CardFormDialog({
	open,
	onOpenChange,
	deckId,
	card,
	onSuccess,
}: CardFormDialogProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const isEdit = !!card

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
	} = useForm<CardFormValues>({
		resolver: zodResolver(buildSchema(t)),
		values: {
			front: toSideValues(card?.front),
			back: toSideValues(card?.back),
			tags: card?.tags ?? [],
		},
	})

	const onSubmit = async (values: CardFormValues) => {
		try {
			if (card) {
				await cardApi.update({
					pathParams: { cardId: card.id },
					body: {
						front: toSideInput(values.front),
						back: toSideInput(values.back),
					},
					silent: true,
				})
				toast.success(t('card.updated'))
			} else {
				await deckApi.createCard({
					pathParams: { deckId },
					body: {
						front: toSideInput(values.front),
						back: toSideInput(values.back),
						tags: values.tags,
					},
					silent: true,
				})
				toast.success(t('card.created'))
			}
			onSuccess()
			onOpenChange(false)
		} catch (error) {
			notifyApiError(error)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? t('card.editTitle') : t('card.addTitle')}
					</DialogTitle>
					<DialogDescription>{t('card.formHint')}</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
					{/* ── Front ─────────────────────────────────────────────── */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold">{t('card.front')}</h3>
						<Field data-invalid={!!errors.front?.text || undefined}>
							<FieldLabel htmlFor="front-text">{t('card.word')}</FieldLabel>
							<Input
								id="front-text"
								placeholder={t('card.wordPlaceholder')}
								{...register('front.text')}
							/>
							<FieldError errors={[errors.front?.text]} />
						</Field>
						<Field data-invalid={!!errors.front?.description || undefined}>
							<FieldLabel htmlFor="front-description">
								{t('card.descriptionLabel')}
							</FieldLabel>
							<Textarea
								id="front-description"
								rows={2}
								placeholder={t('card.descriptionPlaceholder')}
								{...register('front.description')}
							/>
							<FieldError errors={[errors.front?.description]} />
						</Field>
						<Field>
							<FieldLabel>{t('card.image')}</FieldLabel>
							<Controller
								control={control}
								name="front.imageUrl"
								render={({ field }) => (
									<ImageUpload value={field.value} onChange={field.onChange} />
								)}
							/>
						</Field>
					</div>

					<Separator />

					{/* ── Back ──────────────────────────────────────────────── */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold">{t('card.back')}</h3>
						<Field data-invalid={!!errors.back?.text || undefined}>
							<FieldLabel htmlFor="back-text">{t('card.translation')}</FieldLabel>
							<Input
								id="back-text"
								placeholder={t('card.translationPlaceholder')}
								{...register('back.text')}
							/>
							<FieldError errors={[errors.back?.text]} />
						</Field>
						<Field data-invalid={!!errors.back?.description || undefined}>
							<FieldLabel htmlFor="back-description">
								{t('card.descriptionLabel')}
							</FieldLabel>
							<Textarea
								id="back-description"
								rows={2}
								placeholder={t('card.descriptionPlaceholder')}
								{...register('back.description')}
							/>
							<FieldError errors={[errors.back?.description]} />
						</Field>
						<Field>
							<FieldLabel>{t('card.image')}</FieldLabel>
							<Controller
								control={control}
								name="back.imageUrl"
								render={({ field }) => (
									<ImageUpload value={field.value} onChange={field.onChange} />
								)}
							/>
						</Field>
					</div>

					{!isEdit && (
						<>
							<Separator />
							<Field>
								<FieldLabel htmlFor="card-tags">{t('card.tags')}</FieldLabel>
								<Controller
									control={control}
									name="tags"
									render={({ field }) => (
										<TagInput
											id="card-tags"
											value={field.value}
											onChange={field.onChange}
											placeholder={t('card.tagsPlaceholder')}
										/>
									)}
								/>
							</Field>
						</>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							{t('actions.cancel')}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? t('actions.saving') : t('actions.save')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
