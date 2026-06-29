import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://memwords.uk'

// Only the public landing is indexable; app/auth pages are private (noindex).
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: siteUrl,
			changeFrequency: 'monthly',
			priority: 1,
		},
	]
}
