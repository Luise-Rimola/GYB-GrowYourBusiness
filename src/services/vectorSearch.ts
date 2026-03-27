import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ChunkSimilarityMatch = {
  id: string;
  sourceId: string;
  chunkIndex: number;
  text: string;
  similarity: number;
};

function toVectorLiteral(values: number[]): string {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding vector is empty.");
  }
  if (values.length !== 1536) {
    throw new Error(`Embedding dimension ${values.length} does not match vector(1536).`);
  }
  if (values.some((v) => !Number.isFinite(v))) {
    throw new Error("Embedding vector contains non-finite numbers.");
  }
  return `[${values.join(",")}]`;
}

export const VectorSearchService = {
  async saveChunkEmbedding(params: { chunkId: string; embedding: number[] }) {
    const vector = toVectorLiteral(params.embedding);
    await prisma.$executeRaw(
      Prisma.sql`
        update "KnowledgeChunk"
        set "embedding" = ${vector}::vector
        where "id" = ${params.chunkId}
      `
    );
  },

  async findNearestChunks(params: {
    embedding: number[];
    limit?: number;
    sourceId?: string;
  }): Promise<ChunkSimilarityMatch[]> {
    const vector = toVectorLiteral(params.embedding);
    const limit = Math.max(1, Math.min(100, params.limit ?? 8));

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        sourceId: string;
        chunkIndex: number;
        text: string;
        similarity: number;
      }>
    >(
      Prisma.sql`
        select
          "id",
          "sourceId",
          "chunkIndex",
          "text",
          (1 - ("embedding" <=> ${vector}::vector))::float8 as "similarity"
        from "KnowledgeChunk"
        where "embedding" is not null
          and (${params.sourceId ?? null}::text is null or "sourceId" = ${params.sourceId ?? null})
        order by "embedding" <=> ${vector}::vector
        limit ${limit}
      `
    );

    return rows;
  },
};
