import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

const GBRAIN_IMPORT_DIR = path.join(process.cwd(), 'gbrain', 'import');
const PDF_CACHE_DIR = path.join(process.cwd(), 'downloads', 'pdfs');
const SOURCE_ID = 'loudoun-data-center-search';

interface PdfResource {
  title: string;
  url: string;
  source: 'DocumentCenter' | 'LFPortal';
}

const PDF_RESOURCES: PdfResource[] = [
  // DocumentCenter PDFs
  { title: 'Data Center Fact Sheet 2026', url: 'https://www.loudoun.gov/DocumentCenter/View/222193/FINAL-Data-Center-Fact-Sheet-2026?bidId=', source: 'DocumentCenter' },
  { title: 'Data Center - Residents', url: 'https://www.loudoun.gov/DocumentCenter/View/222194/FINAL-Data-Center---Residents?bidId=', source: 'DocumentCenter' },
  { title: '15 Best Practices for Communities Considering Data Centers', url: 'https://www.loudoun.gov/DocumentCenter/View/217610/15-Best-Practices-for-Communities-Considering-Data-Centers?bidId=', source: 'DocumentCenter' },
  { title: 'Statement - Loudoun Board Enacts Pause on Data Centers', url: 'https://www.loudoun.gov/DocumentCenter/View/222331/Statement---Loudoun-Board-Enacts-Pause-on-Data-Centers', source: 'DocumentCenter' },
  { title: '2026 Loudoun County Data Center Guidelines', url: 'https://www.loudoun.gov/DocumentCenter/View/219238/462-Data-Center-2026-Guidelines-PDF', source: 'DocumentCenter' },
  { title: 'Birchwood Community Meeting - Data Centers', url: 'https://www.loudoun.gov/DocumentCenter/View/222362/Birchwood-Conversation-Hour--Data-Centers', source: 'DocumentCenter' },
  { title: 'Application Pathway for SPEX Data Center ZOAM and Grandfathering', url: 'https://www.loudoun.gov/DocumentCenter/View/215836/Appication-Pathway-For-SPEX-Data-Center-ZOAM-and-Grandfathering?bidId=', source: 'DocumentCenter' },
  { title: 'Loudoun County Data Center Brief - Turner', url: 'https://www.loudoun.gov/DocumentCenter/View/217605/Loudoun-County-Data-Center-Brief---Turner', source: 'DocumentCenter' },
  { title: 'Loudoun Board Advances Review of 2025 Grandfathering Exceptions', url: 'https://www.loudoun.gov/DocumentCenter/View/222189/Loudoun-Board-Advances-Review-of-2025-Grandfathering-Exceptions', source: 'DocumentCenter' },
  { title: 'Briskman Advances Proposal to Pause Data Center and Substation Applications', url: 'https://www.loudoun.gov/DocumentCenter/View/221788/Release---Briskman-Advances-Proposal-to-Pause-Data-Center-and-Substation-Applications', source: 'DocumentCenter' },
  // LFPortal PDFs
  { title: 'Data Center Standards and Location Project Plan', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/592700/Item%2004%20Data%20Center%20Standards%20and%20Location%20Project%20Plan.pdf', source: 'LFPortal' },
  { title: 'CPAM-ZOAM Phase 1 Board Report', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/1952618/Item%2007%20Data%20Center%20Standards%20%20Locations%20CPAM-ZOAM%20Phase%201.pdf', source: 'LFPortal' },
  { title: '2025 Non-Residential Pipeline Remaining Floor Area by Fiscal Planning Subarea', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/1970373/2025%20Non-Residential%20Pipeline%20Remaining%20Floor%20Area%20by%20Fiscal%20Planning%20Subarea.pdf', source: 'LFPortal' },
  { title: 'Item I-2 Electrical Substations White Paper', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/1973897/Item%20I-2%20Electrical%20Substations%20White%20Paper.pdf', source: 'LFPortal' },
  { title: 'Item 06 CPAM-2024-0005 Electrical Infrastructure', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/1968719/Item%2006%20CPAM-2024-0005%20Electrical%20Infrastructure.pdf', source: 'LFPortal' },
  { title: 'Item I-2 Electrical Substations White Paper Staff Presentation', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/1973962/Item%20I-2%20Electrical%20Substations%20White%20Paper-Staff%20Presentation.pdf', source: 'LFPortal' },
  { title: 'Resolution Opposing the Proposed Western Loudoun Electrical Transmission Lines', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/598117/Item%2004%20Resolution%20Opposing%20the%20Proposed%20Western%20Loudoun%20Electrical%20Transmission%20Lines.pdf', source: 'LFPortal' },
  { title: 'Business Meeting Action Report 09-15-2026', url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/1975550/09-15-26%20Business%20Meeting%20Action%20Report.pdf', source: 'LFPortal' },
];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function urlToFileName(urlStr: string): string {
  const parsed = new URL(urlStr);
  const pathname = parsed.pathname.replace(/\/$/, '') || 'index';
  const safe = pathname.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
  const hash = Buffer.from(urlStr).toString('base64url').slice(0, 8);
  return `pdf_${safe}_${hash}`;
}

async function downloadAndExtractPdf(resource: PdfResource): Promise<string | null> {
  const fileName = urlToFileName(resource.url);
  const pdfPath = path.join(PDF_CACHE_DIR, `${fileName}.pdf`);
  const mdPath = path.join(GBRAIN_IMPORT_DIR, `${fileName}.md`);

  // Skip if already extracted
  if (fs.existsSync(mdPath)) {
    console.log(`  ⏭️  Already extracted: ${fileName}.md`);
    return mdPath;
  }

  try {
    const response = await axios.get(resource.url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'LoudounDataCenterResearchBot/1.0',
      },
      timeout: 60000,
    });

    fs.writeFileSync(pdfPath, Buffer.from(response.data));

    const extract = require('pdf-text-extract');
    const pages: string[] = await new Promise((resolve, reject) => {
      extract(pdfPath, (err: any, result: string[]) => {
        if (err) reject(err);
        else resolve(result || []);
      });
    });

    const body = pages.join('\n');

    // Filter for data-center relevance (some PDFs may not be directly about data centers)
    const lowerBody = body.toLowerCase();
    const isDataCenterRelated =
      lowerBody.includes('data center') ||
      lowerBody.includes('data centre') ||
      lowerBody.includes('substation') ||
      lowerBody.includes('transmission') ||
      lowerBody.includes('electrical infrastructure') ||
      lowerBody.includes('power generation') ||
      lowerBody.includes('battery energy storage');

    if (!isDataCenterRelated) {
      console.log(`  ⚠️  Skipping (not data-center related): ${resource.title}`);
      fs.unlinkSync(pdfPath);
      return null;
    }

    const markdown = `# ${resource.title}\n\n**Source:** [${resource.url}](${resource.url})\n\n**Resource type:** PDF (${resource.source})\n\n---\n\n${body}`;

    fs.writeFileSync(mdPath, markdown);
    console.log(`  ✅ Extracted: ${fileName}.md`);
    return mdPath;
  } catch (error) {
    console.error(`  ❌ Failed to extract ${resource.title}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  fs.mkdirSync(GBRAIN_IMPORT_DIR, { recursive: true });
  fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });

  console.log(`📄 Extracting ${PDF_RESOURCES.length} PDFs related to Loudoun County data centers...\n`);

  const extracted: string[] = [];

  for (const resource of PDF_RESOURCES) {
    console.log(`Processing: ${resource.title}`);
    console.log(`  ${resource.url}`);
    const result = await downloadAndExtractPdf(resource);
    if (result) extracted.push(result);
    await delay(500);
  }

  console.log(`\n✅ Extracted ${extracted.length} PDFs to ${GBRAIN_IMPORT_DIR}`);

  if (extracted.length > 0) {
    console.log('\n🧠 Ingesting into GBrain...');
    try {
      execSync(`gbrain sources add ${SOURCE_ID} --path ${GBRAIN_IMPORT_DIR}`, { stdio: 'ignore' });
    } catch {
      // Source may already exist
    }

    execSync(`gbrain import ${GBRAIN_IMPORT_DIR} --source ${SOURCE_ID}`, { stdio: 'inherit' });
    execSync(`gbrain extract all`, { stdio: 'inherit' });
    execSync(`gbrain embed --all`, { stdio: 'inherit' });
    console.log('✅ GBrain ingestion complete.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
