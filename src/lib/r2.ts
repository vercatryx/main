import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 configuration using S3-compatible API
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// Validate configuration on import
if (!process.env.R2_ACCOUNT_ID) {
  console.warn("⚠️  R2_ACCOUNT_ID is not set. R2 uploads will fail.");
}

if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.warn("⚠️  R2 credentials are not set. R2 uploads will fail.");
}

if (!R2_BUCKET_NAME) {
  console.warn("⚠️  R2_BUCKET_NAME is not set. R2 uploads will fail.");
}
