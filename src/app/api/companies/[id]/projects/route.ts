/**
 * Company Projects API Routes
 * GET /api/companies/[id]/projects - List projects for a company
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCompanyProjects } from '@/lib/projects';
import { requireCompanyAccess } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompanyAccess(id);

    const projects = await getCompanyProjects(id);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching company projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch projects' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
