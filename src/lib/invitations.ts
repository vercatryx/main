/**
 * User invitation system
 * Sends invitation emails to new users
 */



/**
 * Generate an invitation token (you can use JWT or a simple UUID)
 */
export function generateInvitationToken(email: string, companyId: string): string {
  // For now, use a simple base64 encoded JSON
  // In production, use a signed JWT with expiration
  const payload = {
    email,
    companyId,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify an invitation token
 */
export function verifyInvitationToken(token: string): { email: string; companyId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.expires < Date.now()) {
      return null; // Token expired
    }
    return { email: payload.email, companyId: payload.companyId };
  } catch {
    return null;
  }
}

