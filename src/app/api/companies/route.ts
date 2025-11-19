/**
 * Companies API Routes
 * GET /api/companies - List all companies (super admin only)
 * POST /api/companies - Create a new company (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies, createCompany } from '@/lib/companies';
import { requireSuperAdmin } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const companies = await getAllCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch companies' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const company = await createCompany({ name: body.name });
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create company' },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
