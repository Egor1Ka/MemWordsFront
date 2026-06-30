import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'
import { FantasyEmbers } from '@/components/anki/fantasy-embers'
import { PageContainer } from '@/components/page-container'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getUser } from '@/lib/auth/get-user'
import { UserProvider } from '@/lib/auth/user-provider'

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('metadata')
	return {
		title: t('app'),
		robots: { index: false, follow: false },
	}
}

export default async function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()

	if (!user) redirect('/login')

	return (
		<UserProvider user={user}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="relative overflow-hidden">
					<FantasyEmbers />
					<div className="relative z-10 flex flex-1 flex-col">
						<AppHeader />
						<PageContainer>{children}</PageContainer>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
