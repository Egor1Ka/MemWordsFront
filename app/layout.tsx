import { NewRelicBrowserScript } from '@/lib/monitoring/new-relic-browser-script'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { Press_Start_2P, VT323, DotGothic16 } from 'next/font/google'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://memwords.uk'

// Pixel theme fonts. Press Start 2P and DotGothic16 include Cyrillic, so the
// Ukrainian UI renders in the pixel font too (request the cyrillic subset!).
const fontSans = Press_Start_2P({
	subsets: ['latin', 'cyrillic'],
	weight: '400',
	variable: '--font-press-start',
})
const fontSerif = VT323({
	subsets: ['latin'],
	weight: '400',
	variable: '--font-vt323',
})
const fontMono = DotGothic16({
	subsets: ['latin', 'cyrillic'],
	weight: '400',
	variable: '--font-dotgothic',
})

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	applicationName: 'MemWords',
	title: 'MemWords',
	description:
		'Learn English vocabulary with SM-2 spaced repetition in a dark-fantasy flashcard app.',
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const locale = await getLocale()

	return (
		<html
			lang={locale}
			className={cn(
				'font-sans',
				fontSans.variable,
				fontSerif.variable,
				fontMono.variable,
			)}
			suppressHydrationWarning
		>
			<body className="antialiased">
				{children}
				<NewRelicBrowserScript />
			</body>
		</html>
	)
}
