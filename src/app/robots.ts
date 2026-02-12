import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://nozzleos.com'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/dashboard/', '/shift/', '/api/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
