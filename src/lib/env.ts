function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  firebase: {
    get projectId()   { return requireEnv("FIREBASE_PROJECT_ID"); },
    get clientEmail() { return requireEnv("FIREBASE_CLIENT_EMAIL"); },
    get privateKey()  { return requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"); },
    get apiKey()      { return requireEnv("FIREBASE_API_KEY"); },
  },
  nextAuth: {
    get secret() { return requireEnv("NEXTAUTH_SECRET"); },
    get url()    { return requireEnv("NEXTAUTH_URL"); },
  },
  openai: {
    get apiKey() { return process.env.OPENAI_API_KEY ?? ""; },
  },
  gcs: {
    get bucketName() { return process.env.GCS_BUCKET_NAME ?? ""; },
  },
  get appUrl() { return requireEnv("NEXT_PUBLIC_APP_URL"); },
};
