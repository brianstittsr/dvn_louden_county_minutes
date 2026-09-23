import * as fs from 'fs';
import * as path from 'path';

export interface WikiDocument {
  id: string;
  title: string;
  category: string;
  url: string;
  content: string;
  filePath: string;
  createdAt: Date;
  summary: string;
  keyFacts: string[];
  stakeholders: string[];
  environmentalConcerns: string[];
  communityImpacts: string[];
  dataCenterProjects: string[];
  actionItems: string[];
  relatedTopics: string[];
}

function extractField(content: string, heading: string): string {
  const regex = new RegExp(`## ${heading}\\n\\n([\\s\\S]+?)(?=\\n\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractList(content: string, heading: string): string[] {
  const section = extractField(content, heading);
  return section
    .split('\n')
    .filter(line => line.startsWith('- '))
    .map(line => line.replace('- ', '').trim());
}

export function extractWikiContent(filePath: string): { content: string; metadata: Partial<WikiDocument> } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const category = path.basename(path.dirname(filePath));
  const fileName = path.basename(filePath, '.md');

  const titleMatch = content.match(/^# (.+)$/m);
  const urlMatch = content.match(/\*\*Source:\*\* \[([^\]]+)\]\(([^)]+)\)/);

  const metadata: Partial<WikiDocument> = {
    category,
    filePath,
    title: titleMatch?.[1] || fileName.replace(/_/g, ' '),
    url: urlMatch?.[2] || '',
    summary: extractField(content, 'Summary'),
    keyFacts: extractList(content, 'Key Facts'),
    stakeholders: extractList(content, 'Stakeholders'),
    environmentalConcerns: extractList(content, 'Environmental Concerns'),
    communityImpacts: extractList(content, 'Community Impacts'),
    dataCenterProjects: extractList(content, 'Data Center Projects'),
    actionItems: extractList(content, 'Action Items & Next Steps'),
    relatedTopics: extractList(content, 'Related Topics'),
  };

  return { content, metadata };
}

export function processAllWikis(wikiDir: string): WikiDocument[] {
  const documents: WikiDocument[] = [];

  if (!fs.existsSync(wikiDir)) {
    console.log('Wiki directory does not exist:', wikiDir);
    return documents;
  }

  const categories = fs.readdirSync(wikiDir);

  for (const category of categories) {
    const categoryPath = path.join(wikiDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      if (!file.endsWith('.md') || file === 'index.md') continue;

      const filePath = path.join(categoryPath, file);
      try {
        const { content, metadata } = extractWikiContent(filePath);

        documents.push({
          id: `${category}/${file}`,
          title: metadata.title || file.replace(/_/g, ' ').replace('.md', ''),
          category: metadata.category || category,
          url: metadata.url || '',
          content,
          filePath,
          createdAt: fs.statSync(filePath).mtime,
          summary: metadata.summary || '',
          keyFacts: metadata.keyFacts || [],
          stakeholders: metadata.stakeholders || [],
          environmentalConcerns: metadata.environmentalConcerns || [],
          communityImpacts: metadata.communityImpacts || [],
          dataCenterProjects: metadata.dataCenterProjects || [],
          actionItems: metadata.actionItems || [],
          relatedTopics: metadata.relatedTopics || [],
        });
      } catch (error) {
        console.error(`Error processing wiki ${file}:`, error);
      }
    }
  }

  return documents;
}

export function getWikiDocumentById(wikiDir: string, category: string, fileName: string): WikiDocument | null {
  const filePath = path.join(wikiDir, category, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const { content, metadata } = extractWikiContent(filePath);

    return {
      id: `${category}/${fileName}`,
      title: metadata.title || fileName.replace(/_/g, ' ').replace('.md', ''),
      category: metadata.category || category,
      url: metadata.url || '',
      content,
      filePath,
      createdAt: fs.statSync(filePath).mtime,
      summary: metadata.summary || '',
      keyFacts: metadata.keyFacts || [],
      stakeholders: metadata.stakeholders || [],
      environmentalConcerns: metadata.environmentalConcerns || [],
      communityImpacts: metadata.communityImpacts || [],
      dataCenterProjects: metadata.dataCenterProjects || [],
      actionItems: metadata.actionItems || [],
      relatedTopics: metadata.relatedTopics || [],
    };
  } catch (error) {
    console.error(`Error getting wiki document ${filePath}:`, error);
    return null;
  }
}
