import { NextResponse } from 'next/server';
import { getAllUsers, getUsersByCompany } from '@/lib/users';
import { requireAuth, isSuperAdmin, isUserIdSuperAdmin } from '@/lib/permissions';

async function filterOutSuperUsers<T extends { clerk_user_id: string | null }>(
  users: T[]
): Promise<T[]> {
  if (!users.length) return users;

  const isSuperFlags = await Promise.all(
    users.map((user) =>
      user.clerk_user_id ? isUserIdSuperAdmin(user.clerk_user_id) : Promise.resolve(false)
    )
  );

  return users.filter((_, index) => !isSuperFlags[index]);
}

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const superAdmin = await isSuperAdmin();

    let users;

    if (superAdmin) {
      // Super admin sees all users across all companies (except the super user account itself)
      users = await filterOutSuperUsers(await getAllUsers());
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
