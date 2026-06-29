'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { mediaApi } from '@/services'
import { useApiErrorToast } from '@/lib/anki/use-api-error'
import { cn } from '@/lib/utils'

type ImageUploadVariant = 'box' | 'compact'

interface ImageUploadProps {
	value: string
	onChange: (url: string) => void
	variant?: ImageUploadVariant
	className?: string
}

// Drag-and-drop / click image uploader. Sends the file to the backend media
// service (Cloudinary) and stores the returned public URL. '' means no image.
export function ImageUpload({
	value,
	onChange,
	variant = 'box',
	className,
}: ImageUploadProps) {
	const t = useTranslations('anki')
	const notifyApiError = useApiErrorToast()
	const inputId = useId()
	const inputRef = useRef<HTMLInputElement>(null)
	const [uploading, setUploading] = useState(false)
	const [dragging, setDragging] = useState(false)

	const isCompact = variant === 'compact'

	const uploadFile = async (file: File) => {
		const formData = new FormData()
		formData.append('file', file)
		setUploading(true)
		try {
			const result = await mediaApi.uploadImage({ body: formData, silent: true })
			onChange(result.url)
		} catch (error) {
			notifyApiError(error)
		} finally {
			setUploading(false)
		}
	}

	const acceptFile = (file: File | undefined) => {
		if (!file) return
		if (!file.type.startsWith('image/')) {
			toast.error(t('image.notAnImage'))
			return
		}
		uploadFile(file)
	}

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		acceptFile(event.target.files?.[0])
		event.target.value = ''
	}

	const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
		event.preventDefault()
		setDragging(false)
		acceptFile(event.dataTransfer.files?.[0])
	}

	const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
		event.preventDefault()
		setDragging(true)
	}

	const handleDragLeave = () => setDragging(false)

	const openPicker = () => inputRef.current?.click()

	const removeImage = () => onChange('')

	if (value) {
		return (
			<div className={cn('relative w-fit', className)}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={value}
					alt=""
					className={cn(
						'border-border rounded-lg border object-cover',
						isCompact ? 'h-12 w-12' : 'h-28 w-28',
					)}
				/>
				<button
					type="button"
					onClick={removeImage}
					aria-label={t('image.remove')}
					className="bg-background hover:bg-muted absolute -top-2 -right-2 rounded-full border p-1 shadow-sm"
				>
					<X className="size-3.5" />
				</button>
			</div>
		)
	}

	return (
		<>
			<input
				id={inputId}
				ref={inputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleInputChange}
			/>
			<button
				type="button"
				onClick={openPicker}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				disabled={uploading}
				aria-label={t('image.dropHint')}
				className={cn(
					'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground flex items-center justify-center rounded-lg border border-dashed transition-colors disabled:opacity-60',
					isCompact
						? 'size-12 shrink-0'
						: 'h-28 w-full flex-col gap-1.5 text-sm',
					dragging && 'border-primary bg-muted',
					className,
				)}
			>
				{uploading ? (
					<Loader2 className="size-5 animate-spin" />
				) : isCompact ? (
					<ImagePlus className="size-5" />
				) : (
					<>
						<ImagePlus className="size-5" />
						<span>{t('image.dropHint')}</span>
					</>
				)}
			</button>
		</>
	)
}
