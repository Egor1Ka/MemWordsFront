'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TagFilterProps {
	tags: string[]
	selected: string | null
	onSelect: (tag: string | null) => void
}

export function TagFilter({ tags, selected, onSelect }: TagFilterProps) {
	const t = useTranslations('anki')

	const chipClass = (active: boolean) =>
		cn(
			'cursor-pointer transition-colors',
			!active && 'hover:bg-muted',
		)

	const renderTag = (tag: string) => {
		const active = selected === tag
		return (
			<Badge
				key={tag}
				variant={active ? 'default' : 'outline'}
				className={chipClass(active)}
				onClick={() => onSelect(active ? null : tag)}
			>
				{tag}
			</Badge>
		)
	}

	if (tags.length === 0) return null

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<span className="text-muted-foreground mr-1 text-sm">
				{t('deck.filterByTag')}
			</span>
			<Badge
				variant={selected === null ? 'default' : 'outline'}
				className={chipClass(selected === null)}
				onClick={() => onSelect(null)}
			>
				{t('deck.allTags')}
			</Badge>
			{tags.map(renderTag)}
		</div>
	)
}
