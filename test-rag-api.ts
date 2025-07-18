// Test script to verify RAG search
// Run with: npm run dev, then in another terminal: npx tsx test-rag-api.ts

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { db } from "~/server/db";

async function testRAG() {
  const ctx = await createTRPCContext({
    headers: new Headers(),
  });
  
  const caller = createCaller(ctx);
  
  // Test RAG search
  const results = await caller.rag.search({
    query: "What is the CEO name?",
    limit: 3,
  });
  
  console.log("RAG Search Results:", JSON.stringify(results, null, 2));
  
  // Check file status
  const files = await db.file.findMany({
    where: { status: "completed" },
    select: {
      id: true,
      originalName: true,
      _count: {
        select: { embeddings: true }
      }
    },
    take: 5,
  });
  
  console.log("\nFiles with embeddings:", files);
}

testRAG().catch(console.error);