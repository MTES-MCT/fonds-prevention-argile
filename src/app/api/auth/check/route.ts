import { getCurrentUser, isAuthenticated } from "@/features/auth";
import { userRepo } from "@/shared/database";
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

    // Récupérer l'email depuis la DB
    const dbUser = await userRepo.findById(user.id);

    return NextResponse.json({
      authenticated: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: dbUser?.email ?? null,
        role: user.role,
        authMethod: user.authMethod,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de session:", error);
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
