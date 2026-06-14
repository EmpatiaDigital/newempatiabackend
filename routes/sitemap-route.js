const express = require('express');
const router  = express.Router();
const Post    = require('../models/Post'); 
 
const DOMAIN = 'https://empatiadigital.com.ar';


const STATIC_ROUTES = [
  { path: '/',                             priority: '1.0', changefreq: 'daily'   },
  { path: '/post',                         priority: '0.9', changefreq: 'daily'   },
  { path: '/actividades',                  priority: '0.8', changefreq: 'weekly'  },
  { path: '/informacion',                  priority: '0.8', changefreq: 'weekly'  },
  { path: '/inscription',                  priority: '0.8', changefreq: 'monthly' },
  { path: '/descargas',                    priority: '0.7', changefreq: 'monthly' },
  { path: '/contacto',                     priority: '0.7', changefreq: 'monthly' },
  { path: '/trivia',                       priority: '0.7', changefreq: 'monthly' },
  { path: '/descargo-de-responsabilidad',  priority: '0.4', changefreq: 'yearly'  },
];
 
function toXmlDate(dateStr) {
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}
 
function buildUrl(loc, lastmod, changefreq, priority) {
  return `
  <url>
    <loc>${DOMAIN}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}
 
router.get('/sitemap.xml', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let urls = '';
 
    // 1. Rutas estáticas
    for (const route of STATIC_ROUTES) {
      urls += buildUrl(route.path, today, route.changefreq, route.priority);
    }
 
    // 2. Posts dinámicos desde MongoDB
    const posts = await Post.find({}, '_id updatedAt createdAt').lean();
 
    for (const post of posts) {
      const lastmod = toXmlDate(post.updatedAt || post.createdAt);
      urls += buildUrl(`/post/${post._id}`, lastmod, 'weekly', '0.6');
    }
 
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
 
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1 hora
    res.status(200).send(xml);
 
  } catch (err) {
    console.error('Error generando sitemap:', err);
    res.status(500).send('Error generando sitemap');
  }
});
 
module.exports = router;
