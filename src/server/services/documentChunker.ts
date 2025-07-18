export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  metadata: {
    startChar: number;
    endChar: number;
    section?: string;
    pageNumber?: number;
  };
}

export class DocumentChunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(chunkSize: number = 1000, chunkOverlap: number = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  /**
   * Split text into overlapping chunks
   */
  chunkText(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const cleanText = this.cleanText(text);
    
    // Split by paragraphs first to maintain context
    const paragraphs = this.splitIntoParagraphs(cleanText);
    
    let currentChunk = "";
    let chunkStartChar = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size, save current chunk
      if (currentChunk.length + paragraph.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex,
          metadata: {
            startChar: chunkStartChar,
            endChar: chunkStartChar + currentChunk.length,
          },
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, this.chunkOverlap);
        currentChunk = overlapText + paragraph;
        chunkStartChar = chunkStartChar + currentChunk.length - overlapText.length;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      }
    }

    // Add the last chunk if it exists
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex,
        metadata: {
          startChar: chunkStartChar,
          endChar: chunkStartChar + currentChunk.length,
        },
      });
    }

    return chunks;
  }

  /**
   * Enhanced chunking that preserves document structure
   */
  chunkStructuredText(text: string, _documentType?: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Detect sections (markdown headers, chapter titles, etc.)
    const sections = this.detectSections(text);
    
    let chunkIndex = 0;
    for (const section of sections) {
      // Chunk each section independently to maintain context
      const sectionChunks = this.chunkText(section.content);
      
      for (const chunk of sectionChunks) {
        chunks.push({
          ...chunk,
          chunkIndex: chunkIndex++,
          metadata: {
            ...chunk.metadata,
            section: section.title,
          },
        });
      }
    }

    return chunks.length > 0 ? chunks : this.chunkText(text);
  }

  /**
   * Clean text by removing excessive whitespace and formatting
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
      .replace(/\s+/g, " ") // Normalize spaces
      .replace(/\n\s*\n/g, "\n\n") // Clean empty lines
      .trim();
  }

  /**
   * Split text into paragraphs
   */
  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;
    
    // Try to find a sentence boundary for cleaner overlap
    const lastPeriod = text.lastIndexOf(".", text.length - overlapSize);
    if (lastPeriod > text.length - overlapSize - 100) {
      return text.substring(lastPeriod + 1).trim() + " ";
    }
    
    return text.substring(text.length - overlapSize);
  }

  /**
   * Detect sections in a document (headers, chapters, etc.)
   */
  private detectSections(text: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];
    
    // Detect markdown headers
    const markdownPattern = /^(#{1,6})\s+(.+)$/gm;
    const matches = Array.from(text.matchAll(markdownPattern));
    
    if (matches.length === 0) {
      return [{ title: "Document", content: text }];
    }

    let lastIndex = 0;
    matches.forEach((match, index) => {
      const nextIndex = match.index ?? 0;
      
      // Add content before this header to previous section
      if (index > 0 && sections.length > 0) {
        const lastSection = sections[sections.length - 1];
        if (lastSection) {
          lastSection.content += text.substring(lastIndex, nextIndex);
        }
      } else if (index === 0 && nextIndex > 0) {
        // Content before first header
        sections.push({
          title: "Introduction",
          content: text.substring(0, nextIndex).trim(),
        });
      }

      // Start new section
      sections.push({
        title: match[2]?.trim() ?? "Section",
        content: "",
      });

      lastIndex = nextIndex + match[0].length;
    });

    // Add remaining content to last section
    if (lastIndex < text.length && sections.length > 0) {
      const lastSection = sections[sections.length - 1];
      if (lastSection) {
        lastSection.content = text.substring(lastIndex).trim();
      }
    }

    return sections.filter(s => s.content.trim().length > 0);
  }
}

// Export singleton instance with default settings
export const documentChunker = new DocumentChunker();