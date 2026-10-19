import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign up" };

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignUpPage() {
  if (!hasClerkKey) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:px-6">
        <div className="w-full rounded-2xl border border-slate-800 bg-[#111a2e] p-8">
          <h1 className="text-xl font-extrabold tracking-tight text-white">Sign up unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Authentication is not configured yet. Add your Clerk keys to{" "}
            <code className="font-mono text-slate-300">.env.local</code> (see{" "}
            <code className="font-mono text-slate-300">.env.example</code>) and restart the dev
            server.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span aria-hidden>←</span> Back to stories
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:px-6">
      <SignUp
        appearance={{
          variables: {
            colorBackground: "#111a2e",
            colorPrimary: "#7c3aed",
            borderRadius: "1rem",
          },
          elements: {
            card: "border border-slate-800 shadow-none",
            headerTitle: "text-white",
            headerSubtitle: "text-slate-400",
            socialButtonsBlockButton: "border-slate-700 text-slate-200",
            footerActionText: "text-slate-400",
            footerActionLink: "text-indigo-400",
            formFieldLabel: "text-slate-300",
            formFieldInput: "border-slate-700 bg-[#0a0e1a] text-slate-100",
            formButtonPrimary: "bg-violet-600 hover:bg-violet-500",
          },
        }}
      />
    </main>
  );
}
