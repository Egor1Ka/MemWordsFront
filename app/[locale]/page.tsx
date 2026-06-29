import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
	ArrowRight,
	Brain,
	ImageIcon,
	Layers,
	Moon,
	Pencil,
	Sparkles,
	Swords,
	Table2,
	type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Reveal } from '@/components/landing/reveal'
import { FantasyEmbers } from '@/components/anki/fantasy-embers'
import { RuneCircle } from '@/components/anki/fantasy-icons'
import { getUser } from '@/lib/auth/get-user'

interface FeatureItem {
	key: string
	icon: LucideIcon
}

const FEATURES: FeatureItem[] = [
	{ key: 'srs', icon: Brain },
	{ key: 'decks', icon: Layers },
	{ key: 'images', icon: ImageIcon },
	{ key: 'study', icon: Swords },
	{ key: 'table', icon: Table2 },
	{ key: 'theme', icon: Moon },
]

const STEPS = [
	{ key: 'one', icon: Layers },
	{ key: 'two', icon: Pencil },
	{ key: 'three', icon: Swords },
] as const

export default async function LandingPage() {
	const t = await getTranslations('landing')
	const user = await getUser()
	const isAuthed = !!user
	const primaryHref = isAuthed ? '/decks' : '/login'

	const renderFeature = ({ key, icon: Icon }: FeatureItem, index: number) => (
		<Reveal key={key} delay={index * 90}>
			<Card className="fantasy-card-hover h-full">
				<CardHeader>
					<div className="bg-primary/15 text-primary ring-primary/20 mb-2 flex size-11 items-center justify-center rounded-xl ring-1">
						<Icon className="size-5" />
					</div>
					<CardTitle className="text-base leading-relaxed">
						{t(`features.items.${key}.title`)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground font-mono text-sm leading-relaxed">
						{t(`features.items.${key}.description`)}
					</p>
				</CardContent>
			</Card>
		</Reveal>
	)

	const renderStep = (
		{ key, icon: Icon }: (typeof STEPS)[number],
		index: number,
	) => (
		<Reveal key={key} delay={index * 120} className="h-full">
			<div className="border-border bg-card/40 relative h-full rounded-xl border p-6">
				<div className="text-primary/30 absolute top-4 right-5 font-mono text-4xl font-bold">
					{index + 1}
				</div>
				<Icon className="text-primary mb-4 size-7" />
				<h3 className="mb-2 text-base">{t(`how.steps.${key}.title`)}</h3>
				<p className="text-muted-foreground font-mono text-sm leading-relaxed">
					{t(`how.steps.${key}.description`)}
				</p>
			</div>
		</Reveal>
	)

	return (
		<div className="flex min-h-svh flex-col">
			{/* ── Header ───────────────────────────────────────────────── */}
			<header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
					<Link href="/" className="flex items-center gap-2">
						<Swords className="text-primary animate-glow-pulse size-5" />
						<span className="animate-flicker text-lg font-semibold">
							MemWords
						</span>
					</Link>
					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<ThemeToggle />
						<Button size="sm" render={<Link href={primaryHref} />}>
							{isAuthed ? t('nav.openApp') : t('nav.signIn')}
						</Button>
					</div>
				</div>
			</header>

			<main className="flex-1">
				{/* ── Hero ───────────────────────────────────────────────── */}
				<section className="relative overflow-hidden">
					<FantasyEmbers />
					<div className="pointer-events-none absolute top-1/2 left-1/2 -z-0 size-[34rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2">
						<RuneCircle className="size-full opacity-[0.07]" />
					</div>
					<div className="bg-primary/15 pointer-events-none absolute top-1/3 left-1/2 size-72 max-w-[80vw] -translate-x-1/2 rounded-full blur-3xl" />

					<div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:py-32">
						<Reveal>
							<span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs">
								<Sparkles className="size-3.5" />
								{t('hero.badge')}
							</span>
						</Reveal>
						<Reveal delay={120}>
							<h1 className="mt-6 text-3xl leading-relaxed font-bold tracking-tight sm:text-4xl">
								{t('hero.title')}
							</h1>
						</Reveal>
						<Reveal delay={240}>
							<p className="text-muted-foreground mx-auto mt-6 max-w-xl font-mono text-sm leading-relaxed sm:text-base">
								{t('hero.subtitle')}
							</p>
						</Reveal>
						<Reveal delay={360}>
							<div className="mt-9 flex flex-wrap items-center justify-center gap-3">
								<Button size="lg" render={<Link href={primaryHref} />}>
									<Swords />
									{isAuthed ? t('hero.cta') : t('hero.ctaGuest')}
									<ArrowRight />
								</Button>
								<Button
									size="lg"
									variant="outline"
									render={<a href="#features" />}
								>
									{t('features.title')}
								</Button>
							</div>
						</Reveal>
					</div>
				</section>

				{/* ── Features ───────────────────────────────────────────── */}
				<section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
					<Reveal className="mx-auto max-w-2xl text-center">
						<h2 className="text-2xl leading-relaxed font-bold sm:text-3xl">
							{t('features.title')}
						</h2>
						<p className="text-muted-foreground mt-3 font-mono text-sm">
							{t('features.subtitle')}
						</p>
					</Reveal>
					<div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{FEATURES.map(renderFeature)}
					</div>
				</section>

				{/* ── How it works ───────────────────────────────────────── */}
				<section className="border-border/60 bg-card/20 border-y">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
						<Reveal className="mx-auto max-w-2xl text-center">
							<h2 className="text-2xl leading-relaxed font-bold sm:text-3xl">
								{t('how.title')}
							</h2>
						</Reveal>
						<div className="mt-12 grid gap-5 sm:grid-cols-3">
							{STEPS.map(renderStep)}
						</div>
					</div>
				</section>

				{/* ── Final CTA ──────────────────────────────────────────── */}
				<section className="relative overflow-hidden">
					<div className="bg-primary/10 pointer-events-none absolute top-1/2 left-1/2 size-80 max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
					<div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
						<Reveal>
							<RuneCircle className="text-primary mx-auto size-16 animate-float-slow" />
						</Reveal>
						<Reveal delay={120}>
							<h2 className="mt-6 text-2xl leading-relaxed font-bold sm:text-3xl">
								{t('cta.title')}
							</h2>
						</Reveal>
						<Reveal delay={240}>
							<p className="text-muted-foreground mt-4 font-mono text-sm">
								{t('cta.subtitle')}
							</p>
						</Reveal>
						<Reveal delay={360}>
							<Button
								size="lg"
								className="mt-8"
								render={<Link href={primaryHref} />}
							>
								<Swords />
								{isAuthed ? t('nav.openApp') : t('cta.button')}
								<ArrowRight />
							</Button>
						</Reveal>
					</div>
				</section>
			</main>

			{/* ── Footer ─────────────────────────────────────────────────── */}
			<footer className="border-border/60 border-t">
				<div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 font-mono text-xs sm:flex-row sm:px-6">
					<div className="flex items-center gap-2">
						<Swords className="text-primary size-4" />
						<span>MemWords — {t('footer.tagline')}</span>
					</div>
					<span>{t('footer.rights')}</span>
				</div>
			</footer>
		</div>
	)
}
