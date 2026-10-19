import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const hasKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/settings(.*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export default function proxy(req: NextRequest) {
  // Public-first site: pass through when Clerk keys are absent (preview mode).
  if (!hasKeys) return undefined as unknown as Response;
  return (clerk as unknown as (req: NextRequest) => Response)(req);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
