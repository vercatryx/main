import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCompanyProjects, getProjectById } from '@/lib/projects';
import { getUserByClerkId } from '@/lib/users';

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

    // Check if user is a superuser
    const clerkUser = await currentUser();
    const publicMetadata = clerkUser?.publicMetadata as UserPublicMetadata;
    const isSuperuser = publicMetadata?.role === 'superuser';

    let project;

    if (isSuperuser) {
      // Superusers can access any project
      project = await getProjectById(projectId);
    } else {
      // Regular users can only access projects from their company
      const dbUser = await getUserByClerkId(userId);

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const companyProjects = await getCompanyProjects(dbUser.company_id);
      project = companyProjects.find((p) => p.id === projectId);
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
