import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
	children: ReactNode
	className?: string
}

// The single, project-wide content container. Applied once in the (app) layout
// so every page shares the same near-full width and side padding. `flex-1
// flex-col` lets full-height pages (dashboard, study) keep centering their own
// content.
export function PageContainer({ children, className }: PageContainerProps) {
	return (
		<div
			className={cn(
				'mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8',
				className,
			)}
		>
			{children}
		</div>
	)
}
