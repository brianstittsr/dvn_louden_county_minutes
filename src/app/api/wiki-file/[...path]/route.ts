import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = path.join(process.cwd(), 'wiki', ...params.path);
    
    // Security check: ensure file is within wiki directory
    const wikiDir = path.join(process.cwd(), 'wiki');
    if (!filePath.startsWith(wikiDir)) {
      return new NextResponse('Access denied', { status: 403 });
    }
    
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // If it's a markdown file, render it as HTML
    if (filePath.endsWith('.md')) {
      const content = fileBuffer.toString('utf-8');
      
      // Simple markdown to HTML conversion
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #1a56db; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 2rem; }
    h3 { color: #4b5563; }
    a { color: #1a56db; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { padding-left: 1.5rem; }
    li { margin: 0.5rem 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
    .back-link { display: inline-block; margin-bottom: 2rem; color: #6b7280; }
  </style>
</head>
<body>
  <a href="/issues" class="back-link">← Back to Pages</a>
  ${content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- \[ \] (.+)$/gm, '<li style="list-style: none;"><input type="checkbox" disabled> $1</li>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hlu]|<hr|<a|<input|<p)(.+)$/gm, '<p>$1</p>')
  }
</body>
</html>`;
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    
    // For non-markdown files, serve as plain text
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Error serving file', { status: 500 });
  }
}
