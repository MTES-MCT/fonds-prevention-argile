import { getSession } from "@/lib/auth/simpleAuth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();

    if (session && session.user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          name: "Administrateur",
          role: session.user.role || "admin",
        },
      });
    }

    // Pas de session valide
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
