import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/login/page";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  useSession: jest.fn(() => ({ data: null })),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
}));

jest.mock("next/link", () => {
  // require inside factory — jest.mock is hoisted before imports
  const React = require("react") as typeof import("react");
  const MockLink = ({ href, children, ...props }: { href: string; children: unknown; [k: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children as React.ReactNode);
  MockLink.displayName = "Link";
  return MockLink;
});

import { signIn } from "next-auth/react";
const mockedSignIn = signIn as jest.Mock;

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("email and password fields are required", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });

  it("calls signIn with credentials", async () => {
    mockedSignIn.mockResolvedValue({ error: null });
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email address/i), "sarah@smithlaw.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({ email: "sarah@smithlaw.com", password: "password123", redirect: false })
      );
    });
  });

  it("shows error message on failed login", async () => {
    mockedSignIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email address/i), "sarah@smithlaw.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("has link to signup page", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/signup");
  });

  it("has forgot password link", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });
});
