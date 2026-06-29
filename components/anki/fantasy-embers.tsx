import type { CSSProperties } from 'react'

interface Ember {
	left: number
	bottom: number
	size: number
	duration: number
	delay: number
	drift: number
	opacity: number
}

// Static (deterministic) so server and client render identically — no hydration
// mismatch. Subtle embers drifting up through the content area.
const EMBERS: Ember[] = [
	{ left: 6, bottom: 8, size: 3, duration: 9, delay: 0, drift: 14, opacity: 0.5 },
	{ left: 14, bottom: 40, size: 2, duration: 12, delay: 3, drift: -10, opacity: 0.4 },
	{ left: 22, bottom: 70, size: 4, duration: 8, delay: 1.5, drift: 18, opacity: 0.55 },
	{ left: 31, bottom: 18, size: 2, duration: 13, delay: 5, drift: -16, opacity: 0.35 },
	{ left: 39, bottom: 55, size: 3, duration: 10, delay: 2, drift: 8, opacity: 0.5 },
	{ left: 47, bottom: 85, size: 2, duration: 11, delay: 6, drift: -12, opacity: 0.4 },
	{ left: 54, bottom: 30, size: 4, duration: 9, delay: 0.5, drift: 20, opacity: 0.6 },
	{ left: 62, bottom: 62, size: 3, duration: 12, delay: 4, drift: -8, opacity: 0.45 },
	{ left: 69, bottom: 12, size: 2, duration: 14, delay: 2.5, drift: 12, opacity: 0.35 },
	{ left: 76, bottom: 48, size: 3, duration: 8, delay: 7, drift: -18, opacity: 0.5 },
	{ left: 83, bottom: 78, size: 4, duration: 10, delay: 1, drift: 10, opacity: 0.55 },
	{ left: 90, bottom: 35, size: 2, duration: 13, delay: 5.5, drift: -14, opacity: 0.4 },
	{ left: 95, bottom: 64, size: 3, duration: 11, delay: 3.5, drift: 16, opacity: 0.45 },
]

const toEmberStyle = (ember: Ember): CSSProperties =>
	({
		left: `${ember.left}%`,
		bottom: `${ember.bottom}%`,
		width: ember.size,
		height: ember.size,
		animationDuration: `${ember.duration}s`,
		animationDelay: `${ember.delay}s`,
		'--ember-drift': `${ember.drift}px`,
		'--ember-opacity': ember.opacity,
	}) as CSSProperties

const renderEmber = (ember: Ember, index: number) => (
	<span
		key={index}
		className="animate-ember bg-primary absolute rounded-full"
		style={toEmberStyle(ember)}
	/>
)

export function FantasyEmbers() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			{EMBERS.map(renderEmber)}
		</div>
	)
}
