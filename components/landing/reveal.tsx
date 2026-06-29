'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface RevealProps {
	children: React.ReactNode
	className?: string
	delay?: number
}

// Fade + slide content in when it scrolls into view (IntersectionObserver).
// Respects prefers-reduced-motion by showing immediately.
export function Reveal({ children, className, delay = 0 }: RevealProps) {
	const ref = useRef<HTMLDivElement>(null)
	const [shown, setShown] = useState(false)

	useEffect(() => {
		const node = ref.current
		if (!node) return

		const onIntersect: IntersectionObserverCallback = (entries, observer) => {
			const isVisible = entries.some((entry) => entry.isIntersecting)
			if (isVisible) {
				setShown(true)
				observer.disconnect()
			}
		}

		const observer = new IntersectionObserver(onIntersect, { threshold: 0.15 })
		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	return (
		<div
			ref={ref}
			style={{ transitionDelay: `${delay}ms` }}
			className={cn(
				'transition-all duration-700 ease-out',
				'motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
				shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
				className,
			)}
		>
			{children}
		</div>
	)
}
