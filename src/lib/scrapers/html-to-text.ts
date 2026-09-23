import * as cheerio from 'cheerio';

export interface PageContent {
  title: string;
  description: string;
  bodyText: string;
  markdown: string;
  links: { text: string; url: string }[];
}

export function htmlToMarkdown(html: string, baseUrl: string): PageContent {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, nav, header, footer, iframe, noscript').remove();
  $('.widget-share, .site-tools, .quick-links, .alert, .cookie-banner').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
  const description = $('meta[name="description"]').attr('content') || '';

  const mainContent = $('#contentarea, main, .content, article, .page-content').first();
  const bodyElement = mainContent.length > 0 ? mainContent : $('body');

  const links: { text: string; url: string }[] = [];
  bodyElement.find('a').each((_: number, element: any) => {
    const link = $(element);
    const href = link.attr('href');
    const text = link.text().trim();
    if (href && text) {
      links.push({
        text,
        url: resolveUrl(href, baseUrl),
      });
    }
  });

  const markdown = convertElementToMarkdown(bodyElement, $, baseUrl);
  const bodyText = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*_`]/g, ' ');

  return {
    title,
    description,
    bodyText: cleanWhitespace(bodyText),
    markdown: cleanWhitespace(markdown),
    links,
  };
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  const base = new URL(baseUrl);
  if (url.startsWith('/')) return `${base.origin}${url}`;
  return `${base.origin}/${url}`;
}

function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}

function convertElementToMarkdown(element: any, $: any, baseUrl: string): string {
  const lines: string[] = [];

  element.children().each((_: number, child: any) => {
    const node = $(child);
    const tagName = child.tagName?.toLowerCase() || '';

    if (tagName.match(/^h[1-6]$/)) {
      const level = parseInt(tagName[1], 10);
      const prefix = '#'.repeat(level);
      lines.push(`${prefix} ${node.text().trim()}\n`);
    } else if (tagName === 'p') {
      const text = inlineMarkdown(node, $, baseUrl);
      if (text) lines.push(`${text}\n`);
    } else if (tagName === 'ul' || tagName === 'ol') {
      node.children('li').each((i: number, li: any) => {
        const marker = tagName === 'ol' ? `${i + 1}.` : '-';
        lines.push(`${marker} ${inlineMarkdown($(li), $, baseUrl)}`);
      });
      lines.push('');
    } else if (tagName === 'table') {
      lines.push(convertTableToMarkdown(node, $, baseUrl));
    } else if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
      const childMarkdown = convertElementToMarkdown(node, $, baseUrl);
      if (childMarkdown) lines.push(childMarkdown);
    } else {
      const text = node.text().trim();
      if (text) lines.push(text);
    }
  });

  return lines.join('\n').trim();
}

function inlineMarkdown(node: any, $: any, baseUrl: string): string {
  let text = '';

  node.contents().each((_: number, child: any) => {
    if (child.type === 'text') {
      text += $(child).text();
    } else if (child.type === 'tag') {
      const childNode = $(child);
      const tagName = child.tagName.toLowerCase();
      const childText = childNode.text().trim();

      if (tagName === 'a') {
        const href = childNode.attr('href');
        if (href && childText) {
          text += `[${childText}](${resolveUrl(href, baseUrl)})`;
        } else {
          text += childText;
        }
      } else if (tagName === 'strong' || tagName === 'b') {
        text += `**${childText}**`;
      } else if (tagName === 'em' || tagName === 'i') {
        text += `*${childText}*`;
      } else {
        text += childText;
      }
    }
  });

  return cleanWhitespace(text);
}

function convertTableToMarkdown(table: any, $: any, baseUrl: string): string {
  const rows: string[][] = [];

  table.find('tr').each((_: number, row: any) => {
    const cells: string[] = [];
    $(row).find('td, th').each((_: number, cell: any) => {
      cells.push(inlineMarkdown($(cell), $, baseUrl));
    });
    if (cells.length > 0) rows.push(cells);
  });

  if (rows.length === 0) return '';

  const header = rows[0];
  const divider = header.map(() => '---');

  return [
    `| ${header.join(' | ')} |`,
    `| ${divider.join(' | ')} |`,
    ...rows.slice(1).map(row => `| ${row.join(' | ')} |`),
  ].join('\n');
}
