'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface TagInputProps {
	id?: string
	value: string[]
	onChange: (tags: string[]) => void
	placeholder?: string
}

// Controlled tag editor: type + Enter/comma to add, click ✕ or Backspace to remove.
export function TagInput({ id, value, onChange, placeholder }: TagInputProps) {
	const [draft, setDraft] = useState('')

	const addTag = (raw: string) => {
		const tag = raw.trim()
		if (!tag) return
		if (value.includes(tag)) {
			setDraft('')
			return
		}
		onChange([...value, tag])
		setDraft('')
	}

	const removeTag = (tag: string) => {
		const withoutTag = (current: string) => current !== tag
		onChange(value.filter(withoutTag))
	}

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		const isAddKey = event.key === 'Enter' || event.key === ','
		if (isAddKey) {
			event.preventDefault()
			addTag(draft)
			return
		}
		if (event.key === 'Backspace' && !draft && value.length > 0) {
			removeTag(value[value.length - 1])
		}
	}

	const renderTag = (tag: string) => (
		<Badge key={tag} variant="secondary" className="gap-1">
			{tag}
			<button
				type="button"
				onClick={() => removeTag(tag)}
				className="hover:text-foreground -mr-0.5 cursor-pointer opacity-70 transition-opacity hover:opacity-100"
				aria-label={`Remove ${tag}`}
			>
				<X className="size-3" />
			</button>
		</Badge>
	)

	return (
		<div className="space-y-2">
			{value.length > 0 && (
				<div className="flex flex-wrap gap-1.5">{value.map(renderTag)}</div>
			)}
			<Input
				id={id}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => addTag(draft)}
				placeholder={placeholder}
			/>
		</div>
	)
}
