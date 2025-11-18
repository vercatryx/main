import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getUserProjects, getAllUserProjects } from '@/lib/projects';

interface UserPublicMetadata {
  role?: 'superuser' | 'user';
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await context.params;

    // Check if user is an admin
    const user = await currentUser();
    const publicMetadata = user?.publicMetadata as UserPublicMetadata;
    const isAdmin = publicMetadata?.role === 'superuser';

    let project;

    if (isAdmin) {
      // Admins can access any project
      const allProjects = await getAllUserProjects();
      // Search through all users' projects
      for (const userProjects of Object.values(allProjects)) {
        const found = userProjects.find((p) => p.id === projectId);
        if (found) {
          project = found;
          break;
        }
      }
    } else {
      // Regular users can only access their own projects
      const projects = await getUserProjects(userId);
      project = projects.find((p) => p.id === projectId);
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Return the URL (this will be used by client-side JS)
    // Note: The URL is still somewhat accessible, but not visible in the HTML
    return NextResponse.json({ url: project.url });
  } catch (error) {
    console.error('Error getting project URL:', error);
    return NextResponse.json(
      { error: 'Failed to get project URL' },
      { status: 500 }
    );
  }
}
