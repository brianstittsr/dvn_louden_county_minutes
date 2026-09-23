# Loudoun County Data Center Wiki

AI-powered knowledge base and chat interface for Loudoun County, Virginia information related to data centers. This application ingests public county web pages, processes them with AI, and provides an intelligent chat interface to ask questions about data center community and environmental impacts.

## Features

- **Web Ingestion**: Scrapes Loudoun County website search results for data center-related content
- **Incremental Updates**: Tracks previously processed pages to avoid re-processing
- **Karpathy-Style Wikis**: AI-generated markdown wikis for easy browsing and search
- **AI Chat Interface**: Mobile-responsive chat interface to ask questions about the content
- **Streaming Responses**: Real-time streaming of AI responses
- **GBrain Integration**: Optional GBrain-backed knowledge graph for entity-rich Q&A

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- OpenAI API key
- Bun (for GBrain integration)

### Installation

1. Clone this repository or download the source code
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Running the Application

1. Start the development server:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser
3. Start chatting with the knowledge base!

### Ingesting Loudoun County Data Center Data

> **Important**: The Loudoun County website (`loudoun.gov`) disallows automated crawling of `/Search` in its `robots.txt`. Before running any live scraper or crawler, ensure you have proper authorization from Loudoun County or use only manually supplied source documents.

To fetch a curated set of public Loudoun County data-center pages, generate wikis, and ingest them into GBrain:

```bash
npm run populate:loudoun
```

This command fetches directly linkable public pages (not the `/Search` endpoint), converts HTML/PDFs to markdown, runs AI analysis, builds Karpathy-style wiki pages, and loads everything into GBrain with embeddings.

To extract PDFs specifically and ingest them into GBrain:

```bash
npm run extract:pdfs
```

To run the original scraper code (after verifying authorization):

```bash
npm run scrape
```

To generate wikis from the ingested pages:

```bash
npm run wiki
```

To scrape and generate wikis in one step:

```bash
npm run process-all
```

### GBrain Integration

[GBrain](https://github.com/garrytan/gbrain) is a personal knowledge brain that can ingest pages, extract entities, and answer structured questions.

Install GBrain (requires Bun):

```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun install -g github:garrytan/gbrain
```

Run GBrain ingestion (after verifying authorization):

```bash
npm run gbrain:ingest
```

Run a full site crawl into GBrain (after verifying authorization):

```bash
npm run gbrain:crawl
```

Use the `/gbrain-chat` page to ask AI questions over selected GBrain categories.

## Project Structure

- `src/app/page.tsx`: Main chat interface
- `src/app/gbrain-chat/page.tsx`: GBrain category Q&A page
- `src/app/api/chat/route.ts`: Chat API with RAG
- `src/app/api/scrape/loudoun/route.ts`: Loudoun search scraper API
- `src/lib/scrapers/loudoun-search.ts`: Loudoun search result parser
- `src/lib/wiki-generator-loudoun.ts`: Generates Karpathy-style markdown wikis
- `scripts/populate-loudoun-data.ts`: Fetches curated public Loudoun pages and populates wikis + GBrain
- `scripts/extract-pdfs.ts`: Extracts PDFs from DocumentCenter/LFPortal and ingests into GBrain
- `src/app/api/wiki-file/[...path]/route.ts`: Serves generated wiki files
- `downloads/`: Cached raw HTML/content files
- `wiki/`: Generated markdown wikis
- `data/`: Scraped metadata (search results, etc.)
- `gbrain/`: GBrain project configuration and documentation

## How It Works

1. **Ingestion**: The application fetches Loudoun County search results for `DATA CENTER`, paginates through all pages, and caches result pages.
2. **Processing**: HTML is converted to markdown text and analyzed by AI.
3. **Indexing**: Text is chunked and embedded using OpenAI's embedding model.
4. **Chat**: When you ask a question, the system searches for relevant chunks using vector similarity and sends context to GPT-4.
5. **Wiki Generation**: AI generates hierarchical markdown wikis with summaries, key decisions, and cross-links.
6. **GBrain**: Optional knowledge graph ingestion for entity-based questions.

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required for chat and wiki generation)

## License

MIT
