import jwt from 'jsonwebtoken';

interface JaasJWTPayload {
  context: {
    user: {
      id: string;
      name: string;
      email?: string;
      avatar?: string;
      moderator?: boolean;
    };
    features?: {
      livestreaming?: boolean;
      recording?: boolean;
      transcription?: boolean;
      'outbound-call'?: boolean;
    };
  };
  aud: string;
  iss: string;
  sub: string;
  room: string;
  exp?: number;
  nbf?: number;
}

/**
 * Generate a JWT token for JaaS authentication
 */
export function generateJaasToken(params: {
  roomName: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  isModerator?: boolean;
  expiresInMinutes?: number;
}): string {
  const {
    roomName,
    userId,
    userName,
    userEmail,
    userAvatar,
    isModerator = false,
    expiresInMinutes = 120, // 2 hours default
  } = params;

  const appId = process.env.JAAS_APP_ID;
  const apiKeyId = process.env.JAAS_API_KEY_ID;
  const privateKey = process.env.JAAS_PRIVATE_KEY;

  if (!appId || !apiKeyId || !privateKey) {
    throw new Error('JaaS credentials not configured. Please set JAAS_APP_ID, JAAS_API_KEY_ID, and JAAS_PRIVATE_KEY in your .env.local file.');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInMinutes * 60;

  const payload: JaasJWTPayload = {
    context: {
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        avatar: userAvatar,
        moderator: isModerator,
      },
      features: {
        livestreaming: isModerator,
        recording: isModerator,
        transcription: true,
        'outbound-call': isModerator,
      },
    },
    aud: 'jitsi',
    iss: 'chat',
    sub: appId,
    room: roomName,
    exp,
    nbf: now,
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: {
      kid: apiKeyId, // apiKeyId already contains the full path: appId/keyId
      typ: 'JWT',
      alg: 'RS256',
    },
  });

  return token;
}

/**
 * Get the JaaS domain for meetings
 */
export function getJaasDomain(): string {
  return '8x8.vc';
}

/**
 * Check if JaaS is properly configured
 */
export function isJaasConfigured(): boolean {
  return !!(
    process.env.JAAS_APP_ID &&
    process.env.JAAS_API_KEY_ID &&
    process.env.JAAS_PRIVATE_KEY
  );
}
