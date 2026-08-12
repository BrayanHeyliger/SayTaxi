import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';
import puppeteer from 'puppeteer';

const mdPath = path.resolve(process.cwd(), 'REPORT.md');
const outPdf = path.resolve(process.cwd(), 'REPORT.pdf');
if (!fs.existsSync(mdPath)) {
  console.error('REPORT.md not found');
  process.exit(1);
}
const md = fs.readFileSync(mdPath, 'utf-8');
const mdIt = new MarkdownIt();
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe de cambios</title><style>body{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;color:#111;padding:40px}h1,h2,h3{color:#0f172a}pre{background:#f8fafc;padding:12px;border-radius:8px;overflow:auto}</style></head><body>${mdIt.render(md)}</body></html>`;

try {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true });
  await browser.close();
  console.log('Generated', outPdf);
} catch (err) {
  console.error(err);
  process.exit(1);
}
