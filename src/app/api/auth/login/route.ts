import { authenticateAdmin } from "@/lib/auth/services/auth.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Mot de passe requis" },
        { status: 400 }
      );
    }

    // Utiliser le service d'authentification
    const result = await authenticateAdmin(password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
