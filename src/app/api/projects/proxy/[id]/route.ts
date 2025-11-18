import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProjects } from '@/lib/projects';

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

    // Get user's projects
    const projects = await getUserProjects(userId);
    const project = projects.find((p) => p.id === projectId);

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
