import { NextResponse } from "next/server";
import { getCurrentUser, isAuthenticated } from "@/lib/auth/server";

export async function GET() {
  try {
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    const user = await getCurrentUser();

    return NextResponse.json({
      authenticated: true,
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            authMethod: user.authMethod,
            name:
              user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email || "Administrateur",
          }
        : null,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de session:", error);
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
