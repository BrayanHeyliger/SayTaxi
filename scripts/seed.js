const fs = require('fs');
const path = require('path');

const out = path.resolve(process.cwd(), 'server/_data/news_posts.json');
const sample = [
  {
    id: 'news-1',
    title: 'Bienvenido a SayTaxi',
    summary: 'Lanzamiento inicial del sitio con panel de administración.',
    content: '<p>Hemos lanzado la primera versión de la plataforma. Administra noticias desde el panel.</p>',
    imageUrl: '/uploads/news_seed_1.png',
    publishedAt: new Date().toISOString(),
    author: 'Equipo SayTaxi',
    tags: ['lanzamiento'],
    featured: true,
    slug: 'bienvenido-a-saytaxi'
  },
  {
    id: 'news-2',
    title: 'Mejoras en el editor',
    summary: 'TipTap WYSIWYG y subida de imágenes.',
    content: '<p>El editor de noticias ahora soporta TipTap, imágenes optimizadas y previsualización.</p>',
    imageUrl: '/uploads/news_seed_2.png',
    publishedAt: new Date().toISOString(),
    author: 'Equipo SayTaxi',
    tags: ['editor','tiptap'],
    featured: false,
    slug: 'mejoras-en-el-editor'
  }
];

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(sample, null, 2), 'utf-8');
console.log('Wrote sample news to', out);
console.log('NOTE: To persist to DB, run your DB migrations and import the JSON into the siteSettings table under key "news_posts".');
console.log('Also ensure you set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in your env for super-admin login.');
