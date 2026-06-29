import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Library } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
	const t = await getTranslations('anki')

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
			<h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
			<p className="text-muted-foreground max-w-md text-center">
				{t('dashboard.subtitle')}
			</p>
			<Button render={<Link href="/decks" />}>
				<Library />
				{t('decks.title')}
			</Button>
		</div>
	)
}
