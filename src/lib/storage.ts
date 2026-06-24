import { Storage } from "@google-cloud/storage";

let _storage: Storage | null = null;

export function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    });
  }
  return _storage;
}
