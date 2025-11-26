import { getCurrentUser, isAuthenticated, AUTH_METHODS } from "@/features/auth";
import { userRepo } from "@/shared/database";
import { agentsRepo } from "@/shared/database/repositories";
import { NextResponse } from "next/server";

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

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // ProConnect : récupérer l'agent depuis la DB
    if (user.authMethod === AUTH_METHODS.PROCONNECT) {
      const agent = await agentsRepo.findById(user.id);

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          firstName: user.firstName ?? agent?.givenName,
          lastName: user.lastName ?? agent?.usualName,
          email: agent?.email ?? null,
          role: user.role,
          authMethod: user.authMethod,
        },
      });
    }

    // FranceConnect : récupérer l'utilisateur depuis la DB
    if (user.authMethod === AUTH_METHODS.FRANCECONNECT) {
      const dbUser = await userRepo.findById(user.id);

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: dbUser?.email ?? null,
          role: user.role,
          authMethod: user.authMethod,
        },
      });
    }

    // Fallback (ne devrait pas arriver)
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de session:", error);
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
