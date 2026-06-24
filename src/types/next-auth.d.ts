import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      accountId: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
  interface User {
    accountId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId: string;
  }
}
