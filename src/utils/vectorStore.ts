import { env } from "@/config/env.config";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

const pc = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

function getIndex() {
  return pc.index(env.PINECONE_INDEX_NAME);
}

export async function saveChunks(repo: string, documents: any) {
  const namespace = repo.replace("/", "-");

  const index = getIndex();

  await index.upsert({
    records: documents
  })
}

export async function search(repo, question, topK = DEFAULT_TOP_K) {
    const namespace = repoToNamespace(repo);
    const index = getIndex(namespace);
    const vector = await embeddings.embedQuery(question);
  
    const response = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });
  
    return (response.matches ?? [])
      .map(toSearchDocument)
      .filter((doc) => doc.pageContent.trim().length > 0);
  }
