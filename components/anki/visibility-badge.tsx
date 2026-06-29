'use client'

import { useTranslations } from 'next-intl'
import { Globe, Link2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Visibility } from '@/services'

type BadgeVariant = 'default' | 'secondary' | 'outline'

interface VisibilityMeta {
	variant: BadgeVariant
	Icon: typeof Lock
}

const VISIBILITY_META: Record<Visibility, VisibilityMeta> = {
	private: { variant: 'outline', Icon: Lock },
	public: { variant: 'default', Icon: Globe },
	unlisted: { variant: 'secondary', Icon: Link2 },
}

interface VisibilityBadgeProps {
	visibility: Visibility
}

export function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
	const t = useTranslations('anki')
	const { variant, Icon } = VISIBILITY_META[visibility]

	return (
		<Badge variant={variant} className="gap-1 capitalize">
			<Icon className="size-3" />
			{t(`visibility.${visibility}`)}
		</Badge>
	)
}
