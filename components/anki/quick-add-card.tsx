'use client'

import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ImageUpload } from '@/components/anki/image-upload'
import { TagInput } from '@/components/anki/tag-input'
import { deckApi } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'

const buildSchema = (t: ReturnType<typeof useTranslations>) =>
	z.object({
		word: z.string().trim().min(1, t('validation.textRequired')),
		translation: z.string().trim().min(1, t('validation.textRequired')),
		frontDescription: z.string(),
		frontImage: z.string(),
		backDescription: z.string(),
		backImage: z.string(),
		tags: z.array(z.string()),
	})

type InlineCardValues = z.infer<ReturnType<typeof buildSchema>>

const EMPTY: InlineCardValues = {
	word: '',
	translation: '',
	frontDescription: '',
	frontImage: '',
	backDescription: '',
	backImage: '',
	tags: [],
}

const buildSide = (text: string, description: string, imageUrl: string) => ({
	text: text.trim(),
	description: description.trim() || undefined,
	imageUrl: imageUrl || undefined,
})

interface QuickAddCardProps {
	deckId: string
	onAdded: () => void
}

// Inline card creator. Word + translation always visible; "More fields" expands
// (animated) to descriptions + images for both sides + tags. No modal.
export function QuickAddCard({ deckId, onAdded }: QuickAddCardProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const [expanded, setExpanded] = useState(false)

	const {
		register,
		handleSubmit,
		control,
		reset,
		setFocus,
		formState: { errors, isSubmitting },
	} = useForm<InlineCardValues>({
		resolver: zodResolver(buildSchema(t)),
		defaultValues: EMPTY,
	})

	const onSubmit = async (values: InlineCardValues) => {
		try {
			await deckApi.createCard({
				pathParams: { deckId },
				body: {
					front: buildSide(values.word, values.frontDescription, values.frontImage),
					back: buildSide(
						values.translation,
						values.backDescription,
						values.backImage,
					),
					tags: values.tags,
				},
				silent: true,
			})
			toast.success(t('card.created'))
			onAdded()
			reset(EMPTY)
			setExpanded(false)
			setFocus('word')
		} catch (error) {
			notifyApiError(error)
		}
	}

	const toggleExpanded = () => setExpanded((value) => !value)

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="border-border bg-card/40 rounded-xl border p-4 sm:p-5"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<label
						htmlFor="quick-word"
						className="text-muted-foreground text-xs font-medium"
					>
						{t('card.word')}
					</label>
					<Input
						id="quick-word"
						className="h-11 text-sm"
						placeholder={t('card.wordPlaceholder')}
						aria-invalid={!!errors.word || undefined}
						{...register('word')}
					/>
				</div>
				<div className="space-y-1.5">
					<label
						htmlFor="quick-translation"
						className="text-muted-foreground text-xs font-medium"
					>
						{t('card.translation')}
					</label>
					<Input
						id="quick-translation"
						className="h-11 text-sm"
						placeholder={t('card.translationPlaceholder')}
						aria-invalid={!!errors.translation || undefined}
						{...register('translation')}
					/>
				</div>
			</div>

			{/* Animated expand: grid-rows 0fr → 1fr */}
			<div
				className={cn(
					'grid transition-[grid-template-rows] duration-300 ease-out',
					expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
				)}
			>
				<div className="min-h-0 overflow-hidden">
					<div className="border-border mt-4 grid gap-5 border-t pt-4 sm:grid-cols-2">
						<div className="space-y-2">
							<p className="text-sm font-semibold">{t('card.front')}</p>
							<Textarea
								rows={2}
								className="text-sm"
								placeholder={t('card.descriptionPlaceholder')}
								{...register('frontDescription')}
							/>
							<Controller
								control={control}
								name="frontImage"
								render={({ field }) => (
									<ImageUpload value={field.value} onChange={field.onChange} />
								)}
							/>
						</div>

						<div className="space-y-2">
							<p className="text-sm font-semibold">{t('card.back')}</p>
							<Textarea
								rows={2}
								className="text-sm"
								placeholder={t('card.descriptionPlaceholder')}
								{...register('backDescription')}
							/>
							<Controller
								control={control}
								name="backImage"
								render={({ field }) => (
									<ImageUpload value={field.value} onChange={field.onChange} />
								)}
							/>
						</div>

						<div className="space-y-2 sm:col-span-2">
							<p className="text-sm font-medium">{t('card.tags')}</p>
							<Controller
								control={control}
								name="tags"
								render={({ field }) => (
									<TagInput
										value={field.value}
										onChange={field.onChange}
										placeholder={t('card.tagsPlaceholder')}
									/>
								)}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={toggleExpanded}
					aria-expanded={expanded}
				>
					<ChevronDown
						className={cn('transition-transform', expanded && 'rotate-180')}
					/>
					{expanded ? t('card.lessFields') : t('card.moreFields')}
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					<Plus />
					{t('card.quickAdd')}
				</Button>
			</div>
		</form>
	)
}
