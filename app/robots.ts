import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://memwords.uk'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			// Private, auth-gated areas — keep out of the index.
			disallow: ['/decks', '/dashboard', '/login', '/signup'],
		},
		sitemap: `${siteUrl}/sitemap.xml`,
		host: siteUrl,
	}
}
