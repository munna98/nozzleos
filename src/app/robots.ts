import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://nozzleos.com'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/dashboard/', '/shift/', '/api/', '/admin-dashboard/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
