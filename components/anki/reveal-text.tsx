'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface RevealTextProps {
	text: string
}

// Translation hidden behind a blur ("frosted glass"). Click toggles it with a
// smooth blur→clear animation. Resets naturally when the row (key) changes.
export function RevealText({ text }: RevealTextProps) {
	const t = useTranslations('anki')
	const [revealed, setRevealed] = useState(false)

	const toggle = () => setRevealed((value) => !value)

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={revealed ? text : t('words.tapToReveal')}
			className="group inline-flex cursor-pointer items-center text-left"
		>
			<span
				className={cn(
					'transition-[filter,opacity] duration-300',
					!revealed && 'pointer-events-none blur-[6px] opacity-80 select-none',
				)}
			>
				{text}
			</span>
			{!revealed && (
				<span className="text-muted-foreground ml-2 text-xs whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100">
					{t('words.tapToReveal')}
				</span>
			)}
		</button>
	)
}
