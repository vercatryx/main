import { NextResponse } from 'next/server';
import { getAllUserProjects, getCompanyProjects } from '@/lib/projects';
import { requireAuth, isSuperAdmin } from '@/lib/permissions';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const superAdmin = await isSuperAdmin();

    let projects;

    if (superAdmin) {
      // Super admin sees all projects (legacy format for backward compatibility)
      projects = await getAllUserProjects();
    } else {
      // Company admin sees only their company's projects
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Unauthorized - user not found' },
          { status: 403 }
        );
      }
      const projectsList = await getCompanyProjects(currentUser.company_id);
      // Convert to legacy format for backward compatibility
      projects = { [currentUser.company_id]: projectsList };
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch projects' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
