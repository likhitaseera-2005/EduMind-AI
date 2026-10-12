import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export interface DocumentChunk {
  chunkIndex: number;
  pageNumber: number;
  text: string;
}

export interface StoredDocument {
  docId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  pageCount: number;
  charCount: number;
  isScanned: boolean;
  previewText: string;
  fullText: string;
  chunks: DocumentChunk[];
  warning?: string;
}

// In-memory document storage cache
const documentStore = new Map<string, StoredDocument>();

/**
 * Parses an uploaded PDF or TXT buffer into clean text and structured chunks
 */
export async function parseDocument(
  docId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<StoredDocument> {
  const isPdf = filename.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
  const isTxt = filename.toLowerCase().endsWith('.txt') || mimeType.startsWith('text/');

  if (!isPdf && !isTxt) {
    throw new Error(`Unsupported file type: "${filename}". Only PDF and TXT files are supported.`);
  }

  let extractedText = '';
  let pageCount = 1;
  let isScanned = false;
  let warning: string | undefined;

  if (isTxt) {
    extractedText = buffer.toString('utf-8');
    if (!extractedText.trim()) {
      throw new Error(`The uploaded text file "${filename}" is empty.`);
    }
    pageCount = Math.max(1, Math.ceil(extractedText.length / 2500));
  } else if (isPdf) {
    try {
      const pdfParseModule = require('pdf-parse');
      const PDFParseClass = pdfParseModule.PDFParse;
      if (typeof PDFParseClass === 'function') {
        const parserInstance = new PDFParseClass({ data: buffer });
        const result = await parserInstance.getText();
        extractedText = result.text || '';
        pageCount = result.pages?.length || (result as any).numPages || 1;
        if (typeof parserInstance.destroy === 'function') {
          await parserInstance.destroy();
        }
      } else if (typeof pdfParseModule === 'function') {
        const result = await pdfParseModule(buffer);
        extractedText = result.text || '';
        pageCount = result.numpages || 1;
      } else {
        throw new Error('PDF parsing engine could not be initialized.');
      }
    } catch (pdfErr: any) {
      console.error('[DocumentParser] Error parsing PDF:', pdfErr);
      throw new Error(`Failed to parse PDF "${filename}": ${pdfErr?.message || 'Corrupted or unsupported PDF structure.'}`);
    }

    // Clean up excessive whitespace
    extractedText = extractedText.replace(/\r\n/g, '\n').trim();

    // Check for scanned / image-only PDFs
    if (extractedText.length < 30) {
      isScanned = true;
      warning = `This PDF appears to be a scanned document or contains only rasterized images without an embedded text layer (${pageCount} page(s) detected, but only ${extractedText.length} characters extracted). OCR is required to read scanned content.`;
    }
  }

  // Create manageable chunks
  const chunks = chunkText(extractedText, pageCount);
  const previewText = extractedText.slice(0, 300) + (extractedText.length > 300 ? '...' : '');

  const storedDoc: StoredDocument = {
    docId,
    filename,
    mimeType,
    sizeBytes: buffer.length,
    uploadedAt: new Date().toISOString(),
    pageCount,
    charCount: extractedText.length,
    isScanned,
    previewText,
    fullText: extractedText,
    chunks,
    warning,
  };

  documentStore.set(docId, storedDoc);
  return storedDoc;
}

/**
 * Splits document text into structured chunks of ~1200 characters with 150-char overlap
 */
function chunkText(text: string, totalPages: number): DocumentChunk[] {
  if (!text || text.length === 0) return [];
  const chunkSize = 1200;
  const overlap = 150;
  const chunks: DocumentChunk[] = [];
  const charsPerPage = Math.max(1, Math.ceil(text.length / Math.max(1, totalPages)));

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);

    // Try not to break words in half
    if (endIndex < text.length) {
      const nextSpace = text.indexOf(' ', endIndex);
      if (nextSpace !== -1 && nextSpace - endIndex < 80) {
        endIndex = nextSpace;
      }
    }

    const chunkContent = text.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      const approxPage = Math.min(totalPages, Math.max(1, Math.floor(startIndex / charsPerPage) + 1));
      chunks.push({
        chunkIndex,
        pageNumber: approxPage,
        text: chunkContent,
      });
      chunkIndex++;
    }

    startIndex += chunkSize - overlap;
    if (startIndex >= text.length) break;
  }

  return chunks;
}

/**
 * Retrieves the most relevant chunks from a stored document for a given query
 */
export function retrieveRelevantChunks(docId: string, query: string, maxChunks = 5): string {
  const doc = documentStore.get(docId);
  if (!doc) return '';

  // If document is small enough (< 5000 chars), return the whole text directly
  if (doc.fullText.length <= 5000) {
    return `[Document: ${doc.filename} | Total Pages: ${doc.pageCount}]\n${doc.fullText}`;
  }

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);

  if (queryTerms.length === 0) {
    // Return first few chunks if no specific query terms
    return doc.chunks
      .slice(0, maxChunks)
      .map(c => `[Page ${c.pageNumber}, Section ${c.chunkIndex + 1}]:\n${c.text}`)
      .join('\n\n');
  }

  // Score each chunk based on term frequency
  const scoredChunks = doc.chunks.map(chunk => {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const count = (chunkLower.match(new RegExp(term, 'g')) || []).length;
      score += count * (term.length > 5 ? 1.5 : 1.0);
    }
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  const top = scoredChunks
    .filter(item => item.score > 0)
    .slice(0, maxChunks)
    .map(item => item.chunk);

  // If no hits, fallback to initial chunks
  const selected = top.length > 0 ? top : doc.chunks.slice(0, 3);

  // Sort back by original order for coherent context
  selected.sort((a, b) => a.chunkIndex - b.chunkIndex);

  return selected
    .map(c => `[From ${doc.filename} - Page ${c.pageNumber}, Section ${c.chunkIndex + 1}]:\n${c.text}`)
    .join('\n\n');
}

export function getDocument(docId: string): StoredDocument | undefined {
  return documentStore.get(docId);
}

export function deleteDocument(docId: string): boolean {
  return documentStore.delete(docId);
}
