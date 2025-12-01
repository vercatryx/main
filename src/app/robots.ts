import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vercatryx.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/contact',
          '/sign-in',
          '/sign-up',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/meetings',
          '/meetings/*',
          '/clients',
          '/clients/*',
          '/api/*',
          '/sign/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
