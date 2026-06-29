'use client'

import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Icon visibility is driven purely by the `.dark` class (CSS), so there is no
// hydration mismatch and no effect/state needed.
export function ThemeToggle() {
	const t = useTranslations('anki')
	const { resolvedTheme, setTheme } = useTheme()

	const toggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggle}
			aria-label={t('theme.toggle')}
		>
			<Sun className="hidden dark:block" />
			<Moon className="block dark:hidden" />
		</Button>
	)
}
