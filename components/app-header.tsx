'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LogOut, Pencil } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import type { User } from '@/services'
import { useUser } from '@/lib/auth/user-provider'
import { useLogout } from '@/hooks/use-logout'

export function AppHeader() {
	const t = useTranslations('anki')
	const user = useUser()
	const [currentUser, setCurrentUser] = useState<User>(user)
	const [editOpen, setEditOpen] = useState(false)

	const handleLogout = useLogout()

	const handleNameUpdated = (updatedUser: User) => {
		setCurrentUser(updatedUser)
		setEditOpen(false)
	}

	return (
		<header className="border-border flex h-14 items-center gap-2 border-b px-4">
			<SidebarTrigger />
			<div className="flex-1" />
			<LanguageSwitcher />
			<ThemeToggle />
			<DropdownMenu>
				<DropdownMenuTrigger
					suppressHydrationWarning
					className="flex cursor-pointer items-center gap-2 outline-none"
				>
					<span className="hidden text-sm font-medium sm:inline">
						{currentUser.name}
					</span>
					<Avatar size="sm">
						<AvatarImage
							src={currentUser.avatar}
							alt={currentUser.name}
							referrerPolicy="no-referrer"
						/>
						<AvatarFallback>
							{currentUser.name?.charAt(0)?.toUpperCase() ?? '?'}
						</AvatarFallback>
					</Avatar>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuGroup>
						<DropdownMenuLabel>
							<div className="flex flex-col gap-1">
								<span className="text-sm font-medium">{currentUser.name}</span>
								<span className="text-muted-foreground text-xs">
									{currentUser.email}
								</span>
							</div>
						</DropdownMenuLabel>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => setEditOpen(true)}>
							<Pencil />
							{t('account.editName')}
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={handleLogout}>
							<LogOut />
							{t('account.logout')}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<EditProfileDialog
				user={currentUser}
				open={editOpen}
				onOpenChange={setEditOpen}
				onSuccess={handleNameUpdated}
			/>
		</header>
	)
}
