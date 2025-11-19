import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { addProject, getUserProjects } from '@/lib/projects';
import { getUserByClerkId } from '@/lib/users';

// Get projects for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projects = await getUserProjects(userId);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// Add a project (superuser only)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if they're a superuser
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const isSuperuser = (clerkUser.publicMetadata as { role?: string })?.role === 'superuser';

    // Only superusers can create projects
    if (!isSuperuser) {
      return NextResponse.json(
        { error: 'Only superusers can create projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetCompanyId, title, url, description } = body;

    if (!targetCompanyId || !title || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const project = await addProject(targetCompanyId, title, url, description);
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
