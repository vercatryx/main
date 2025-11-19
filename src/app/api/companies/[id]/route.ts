/**
 * Company API Routes
 * GET /api/companies/[id] - Get company details
 * PATCH /api/companies/[id] - Update company
 * DELETE /api/companies/[id] - Delete company
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCompanyById, updateCompany, deleteCompany, getCompanyStats } from '@/lib/companies';
import { requireSuperAdmin, requireCompanyAccess } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompanyAccess(id);

    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const stats = await getCompanyStats(id);

    return NextResponse.json({ ...company, stats });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch company' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireSuperAdmin();

    const body = await req.json();

    if (body.name && typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid company name' },
        { status: 400 }
      );
    }

    const company = await updateCompany(id, { name: body.name });
    return NextResponse.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update company' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireSuperAdmin();

    await deleteCompany(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete company' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
