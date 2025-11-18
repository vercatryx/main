/**
 * Migration script to upload local projects.json to Vercel Blob
 * Run with: npx tsx scripts/migrate-projects-to-blob.ts
 */

import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

async function migrate() {
  try {
    // Read local projects file
    if (!fs.existsSync(PROJECTS_FILE)) {
      console.log('❌ No local projects.json file found at:', PROJECTS_FILE);
      process.exit(1);
    }

    const projectsData = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    console.log('📖 Read local projects.json');
    console.log('Data:', projectsData);

    // Upload to Vercel Blob
    console.log('\n📤 Uploading to Vercel Blob...');
    const result = await put('client-projects.json', projectsData, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log('✅ Successfully uploaded projects to Vercel Blob!');
    console.log('Blob URL:', result.url);
    console.log('Blob pathname:', result.pathname);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

migrate();
