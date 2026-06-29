import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('metadata')
	const title = t('title')
	const description = t('description')

	return {
		title: { default: t('home'), template: `%s · ${title}` },
		description,
		applicationName: title,
		openGraph: {
			title: t('home'),
			description,
			siteName: title,
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: t('home'),
			description,
		},
		robots: { index: true, follow: true },
	}
}

export default async function LocaleLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const locale = await getLocale()
	const messages = await getMessages()

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				enableSystem={false}
				disableTransitionOnChange
			>
				{children}
				<Toaster />
			</ThemeProvider>
		</NextIntlClientProvider>
	)
}
