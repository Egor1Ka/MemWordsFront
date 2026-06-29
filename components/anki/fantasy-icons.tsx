import { cn } from '@/lib/utils'

interface FantasyIconProps {
	className?: string
}

// Animated arcane circle: two counter-rotating dashed rings around a glowing
// open grimoire (book of knowledge). Inherits color via currentColor.
export function RuneCircle({ className }: FantasyIconProps) {
	return (
		<svg
			viewBox="0 0 100 100"
			fill="none"
			stroke="currentColor"
			aria-hidden
			className={cn('text-primary', className)}
		>
			<g className="animate-rune-spin">
				<circle cx="50" cy="50" r="47" strokeWidth="1" strokeDasharray="2 7" />
				<circle cx="50" cy="50" r="41" strokeWidth="0.75" opacity="0.5" />
			</g>
			<g className="animate-rune-spin-reverse" opacity="0.85">
				<circle cx="50" cy="50" r="33" strokeWidth="1" strokeDasharray="9 5" />
			</g>
			{/* Open book (lucide BookOpen geometry), centered & scaled into the circle */}
			<g
				className="fantasy-glow"
				transform="translate(27 27) scale(1.92)"
				strokeWidth="1.1"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M12 7v14" />
				<path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
			</g>
		</svg>
	)
}
