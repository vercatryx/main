/**
 * Reset script to delete all blobs and recreate from local data
 * Run with: npx tsx scripts/reset-blob.ts
 */

import { put, list, del } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

async function reset() {
  try {
    // Delete all existing blobs
    console.log('🗑️  Deleting all existing blobs...');
    const { blobs } = await list({ prefix: 'client-projects' });

    console.log(`Found ${blobs.length} blobs to delete`);
    for (const blob of blobs) {
      await del(blob.url);
      console.log(`Deleted: ${blob.pathname}`);
    }

    // Read local projects file
    if (!fs.existsSync(PROJECTS_FILE)) {
      console.log('❌ No local projects.json file found');
      process.exit(1);
    }

    const projectsData = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    console.log('\n📖 Read local projects.json');

    // Upload fresh blob
    console.log('\n📤 Uploading fresh blob...');
    const result = await put('client-projects.json', projectsData, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log('✅ Successfully uploaded!');
    console.log('Blob URL:', result.url);
    console.log('\n🎉 Reset complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

reset();
