import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { WikiDocument } from './wiki-processor';

export interface DocumentChunk {
  id: string;
  documentId: string;
  title: string;
  category: string;
  content: string;
  embedding: number[];
}

export class VectorStore {
  private chunks: DocumentChunk[] = [];
  private embeddingModel = 'text-embedding-3-small';

  async indexDocuments(documents: WikiDocument[]): Promise<void> {
    this.chunks = [];

    for (const doc of documents) {
      const chunksToEmbed: { id: string; content: string }[] = [];

      chunksToEmbed.push({
        id: `${doc.id}-full`,
        content: `Page: ${doc.title}\nURL: ${doc.url}\nCategory: ${doc.category}\n\nSummary: ${doc.summary}\n\nContent:\n${doc.content.slice(0, 2000)}`,
      });

      if (doc.dataCenterProjects && doc.dataCenterProjects.length > 0) {
        chunksToEmbed.push({
          id: `${doc.id}-projects`,
          content: `Page: ${doc.title}\nURL: ${doc.url}\nData Center Projects:\n${doc.dataCenterProjects.map(p => `- ${p}`).join('\n')}`,
        });
      }

      if (doc.environmentalConcerns && doc.environmentalConcerns.length > 0) {
        chunksToEmbed.push({
          id: `${doc.id}-environmental`,
          content: `Page: ${doc.title}\nURL: ${doc.url}\nEnvironmental Concerns:\n${doc.environmentalConcerns.map(c => `- ${c}`).join('\n')}`,
        });
      }

      if (doc.communityImpacts && doc.communityImpacts.length > 0) {
        chunksToEmbed.push({
          id: `${doc.id}-community`,
          content: `Page: ${doc.title}\nURL: ${doc.url}\nCommunity Impacts:\n${doc.communityImpacts.map(i => `- ${i}`).join('\n')}`,
        });
      }

      if (doc.stakeholders && doc.stakeholders.length > 0) {
        chunksToEmbed.push({
          id: `${doc.id}-stakeholders`,
          content: `Page: ${doc.title}\nURL: ${doc.url}\nStakeholders:\n${doc.stakeholders.map(s => `- ${s}`).join('\n')}`,
        });
      }

      const sections = this.splitByHeaders(doc.content);
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].length > 50) {
          chunksToEmbed.push({
            id: `${doc.id}-section-${i}`,
            content: `Page: ${doc.title}\nURL: ${doc.url}\nSection: ${sections[i].slice(0, 1000)}`,
          });
        }
      }

      for (const chunk of chunksToEmbed) {
        const { embedding } = await embed({
          model: openai.embedding(this.embeddingModel),
          value: chunk.content,
        });

        this.chunks.push({
          id: chunk.id,
          documentId: doc.id,
          title: doc.title,
          category: doc.category,
          content: chunk.content,
          embedding,
        });
      }
    }
  }

  private splitByHeaders(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
      if (line.match(/^#{2,3}\s/)) {
        if (currentSection.trim()) {
          sections.push(currentSection.trim());
        }
        currentSection = line + '\n';
      } else {
        currentSection += line + '\n';
      }
    }

    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }

    return sections;
  }

  async search(query: string, topK: number = 5): Promise<DocumentChunk[]> {
    const { embedding: queryEmbedding } = await embed({
      model: openai.embedding(this.embeddingModel),
      value: query,
    });

    const similarities = this.chunks.map(chunk => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK).map(s => s.chunk);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  getChunks(): DocumentChunk[] {
    return this.chunks;
  }
}

let globalVectorStore: VectorStore | null = null;

export async function getVectorStore(): Promise<VectorStore> {
  if (!globalVectorStore) {
    globalVectorStore = new VectorStore();
  }
  return globalVectorStore;
}
