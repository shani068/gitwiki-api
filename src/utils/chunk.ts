import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

export interface RepoFile {
  path: string;
  content: string;
}

export interface ChunkMetadata {
  path: string;
  repo: string;
}

export const chunkFiles = async (
  files: RepoFile[],
  repo: string
): Promise<Document<ChunkMetadata>[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  const documents: Document<ChunkMetadata>[] = [];

  for (const file of files) {
    const chunks = await splitter.createDocuments([file.content], [{ path: file.path, repo }]);

    for (const chunk of chunks) {
      documents.push(
        new Document<ChunkMetadata>({
          pageContent: chunk.pageContent,
          metadata: { path: file.path, repo },
        })
      );
    }
  }

  return documents;
};
