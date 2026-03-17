import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

function getText(itemXml: string, tag: string): string {
  // Try CDATA first, then plain text
  const cdata = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return plain ? plain[1].trim() : '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const rawTitle = decodeEntities(getText(item, 'title'));
    const link = getText(item, 'link').replace(/^<!\[CDATA\[|\]\]>$/g, '');
    const pubDate = getText(item, 'pubDate');
    const rawDesc = getText(item, 'description');
    const snippet = decodeEntities(rawDesc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')).slice(0, 160);

    // Google News title format: "Article Title - Source Name"
    const dashIdx = rawTitle.lastIndexOf(' - ');
    const title = dashIdx > 0 ? rawTitle.slice(0, dashIdx) : rawTitle;
    const source = dashIdx > 0 ? rawTitle.slice(dashIdx + 3) : getText(item, 'source');

    if (title && link) {
      items.push({ title, link, pubDate, source, snippet });
    }
  }
  return items;
}

export async function GET() {
  try {
    const url =
      'https://news.google.com/rss/search?q=india+food+restaurant&hl=en-IN&gl=IN&ceid=IN:en';
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('RSS fetch failed');
    const xml = await res.text();
    const news = parseRss(xml).slice(0, 20);
    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ news: [] });
  }
}
