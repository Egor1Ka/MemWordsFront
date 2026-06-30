'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	Compass,
	LayoutDashboard,
	Library,
	Swords,
	type LucideIcon,
} from 'lucide-react'
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'

interface NavItem {
	href: string
	icon: LucideIcon
	labelKey: string
}

const NAV_ITEMS: NavItem[] = [
	{ href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.title' },
	{ href: '/decks', icon: Library, labelKey: 'decks.title' },
	{ href: '/explore', icon: Compass, labelKey: 'nav.explore' },
]

export function AppSidebar() {
	const pathname = usePathname()
	const t = useTranslations('anki')

	const isActive = (href: string) =>
		pathname === href || pathname.startsWith(`${href}/`)

	const renderItem = ({ href, icon: Icon, labelKey }: NavItem) => (
		<SidebarMenuItem key={href}>
			<SidebarMenuButton
				isActive={isActive(href)}
				tooltip={t(labelKey)}
				render={<Link href={href} />}
			>
				<Icon />
				<span>{t(labelKey)}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	)

	return (
		<Sidebar>
			<SidebarHeader>
				<div className="flex items-center gap-2 px-2 py-1.5">
					<Swords className="text-primary animate-glow-pulse size-5" />
					<span className="animate-flicker text-lg font-semibold">
						{t('nav.brand')}
					</span>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{t('nav.menu')}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>{NAV_ITEMS.map(renderItem)}</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	)
}
