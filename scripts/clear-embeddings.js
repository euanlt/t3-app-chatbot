#!/usr/bin/env node
/**
 * Script to clear all existing embeddings from the database
 * This is useful when switching from OpenAI to Gemini embeddings
 * as the dimensions are different (1536 -> 768)
 * 
 * Usage: node scripts/clear-embeddings.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function clearEmbeddings() {
  console.log('🗑️  Clearing all document embeddings...\n');

  try {
    // Count existing embeddings
    const count = await prisma.documentEmbedding.count();
    console.log(`Found ${count} embeddings to delete.`);

    if (count === 0) {
      console.log('No embeddings to clear. ✅');
      return;
    }

    // Prompt for confirmation
    console.log('\n⚠️  WARNING: This will delete all embeddings!');
    console.log('Files will need to be reprocessed to generate new Gemini embeddings.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all embeddings
    console.log('\nDeleting embeddings...');
    const result = await prisma.documentEmbedding.deleteMany({});
    
    console.log(`\n✅ Successfully deleted ${result.count} embeddings.`);

    // Reset file statuses to trigger reprocessing
    console.log('\nResetting file statuses...');
    const filesResult = await prisma.file.updateMany({
      where: {
        status: 'completed'
      },
      data: {
        status: 'pending'
      }
    });

    console.log(`✅ Reset ${filesResult.count} files to 'pending' status.`);
    console.log('\n🎉 Done! Upload files again to generate new Gemini embeddings.');

  } catch (error) {
    console.error('❌ Error clearing embeddings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearEmbeddings();