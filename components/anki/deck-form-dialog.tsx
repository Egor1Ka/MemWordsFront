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
import {
	Field,
	FieldError,
	FieldLabel,
	FieldDescription,
} from '@/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { deckApi } from '@/services'
import type { CreateDeckBody, DeckDTO, UpdateDeckBody } from '@/services'
import { VISIBILITIES } from '@/lib/anki/constants'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

const buildSchema = (t: ReturnType<typeof useTranslations>) =>
	z.object({
		name: z.string().trim().min(1, t('validation.nameRequired')),
		description: z.string().max(500, t('validation.descriptionMax')),
		visibility: z.enum(['private', 'public', 'unlisted']),
	})

type DeckFormValues = z.infer<ReturnType<typeof buildSchema>>

const toBody = (values: DeckFormValues): CreateDeckBody & UpdateDeckBody => ({
	name: values.name.trim(),
	description: values.description.trim() || undefined,
	visibility: values.visibility,
})

interface DeckFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	deck?: DeckDTO
	onSuccess: () => void
}

export function DeckFormDialog({
	open,
	onOpenChange,
	deck,
	onSuccess,
}: DeckFormDialogProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const isEdit = !!deck

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
	} = useForm<DeckFormValues>({
		resolver: zodResolver(buildSchema(t)),
		values: {
			name: deck?.name ?? '',
			description: deck?.description ?? '',
			visibility: deck?.visibility ?? 'private',
		},
	})

	const onSubmit = async (values: DeckFormValues) => {
		try {
			if (deck) {
				await deckApi.update({
					pathParams: { deckId: deck.id },
					body: toBody(values),
					silent: true,
				})
				toast.success(t('deck.updated'))
			} else {
				await deckApi.create({ body: toBody(values), silent: true })
				toast.success(t('deck.created'))
			}
			onSuccess()
			onOpenChange(false)
		} catch (error) {
			notifyApiError(error)
		}
	}

	const renderVisibilityOption = (visibility: DeckFormValues['visibility']) => (
		<SelectItem key={visibility} value={visibility}>
			{t(`visibility.${visibility}`)}
		</SelectItem>
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? t('deck.editTitle') : t('deck.createTitle')}
					</DialogTitle>
					<DialogDescription>{t('deck.formHint')}</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="deck-name">{t('deck.name')}</FieldLabel>
						<Input
							id="deck-name"
							placeholder={t('deck.namePlaceholder')}
							{...register('name')}
						/>
						<FieldError errors={[errors.name]} />
					</Field>

					<Field data-invalid={!!errors.description || undefined}>
						<FieldLabel htmlFor="deck-description">
							{t('deck.description')}
						</FieldLabel>
						<Textarea
							id="deck-description"
							rows={3}
							placeholder={t('deck.descriptionPlaceholder')}
							{...register('description')}
						/>
						<FieldError errors={[errors.description]} />
					</Field>

					<Field>
						<FieldLabel>{t('deck.visibility')}</FieldLabel>
						<FieldDescription>{t('deck.visibilityHint')}</FieldDescription>
						<Controller
							control={control}
							name="visibility"
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{VISIBILITIES.map(renderVisibilityOption)}
									</SelectContent>
								</Select>
							)}
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
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? t('actions.saving') : t('actions.save')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
