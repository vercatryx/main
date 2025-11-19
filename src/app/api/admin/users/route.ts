import { NextResponse } from 'next/server';
import { getAllUsers, getUsersByCompany } from '@/lib/users';
import { requireAuth, isSuperAdmin } from '@/lib/permissions';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const superAdmin = await isSuperAdmin();

    let users;

    if (superAdmin) {
      // Super admin sees all users across all companies
      users = await getAllUsers();
    } else {
      // Company admin sees only their company's users
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Unauthorized - user not found' },
          { status: 403 }
        );
      }
      users = await getUsersByCompany(currentUser.company_id);
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
