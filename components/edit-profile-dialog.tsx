'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { userApi, setServerErrors } from '@/services'
import type { User } from '@/services'

const buildSchema = (t: ReturnType<typeof useTranslations>) =>
	z.object({
		name: z.string().min(2, t('account.nameMin')),
	})

type FormData = z.infer<ReturnType<typeof buildSchema>>

interface EditProfileDialogProps {
	user: User
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: (user: User) => void
}

export function EditProfileDialog({
	user,
	open,
	onOpenChange,
	onSuccess,
}: EditProfileDialogProps) {
	const t = useTranslations('anki')

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(buildSchema(t)),
		values: { name: user.name },
	})

	const onSubmit = async (data: FormData) => {
		try {
			const res = await userApi.update({
				pathParams: { id: user.id },
				body: data,
			})
			toast.success(t('account.updated'))
			onSuccess(res.data)
		} catch (err) {
			setServerErrors(err, setError)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('account.editName')}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="name">{t('account.name')}</FieldLabel>
						<Input id="name" {...register('name')} />
						<FieldError errors={[errors.name]} />
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
