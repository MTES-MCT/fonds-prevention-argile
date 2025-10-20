import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/features/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  const session = await getSession();

  return NextResponse.json({
    cookies: {
      hasSessionCookie: !!sessionCookie,
      sessionSize: sessionCookie?.value?.length || 0,
    },
    session: session
      ? {
          userId: session.userId,
          role: session.role,
          authMethod: session.authMethod,
          hasToken: !!session.fcIdToken,
          expiresAt: new Date(session.exp),
        }
      : null,
  });
}
