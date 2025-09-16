import { NextResponse } from "next/server";
import { logout } from "@/lib/auth/server";

export async function POST() {
  try {
    const logoutInfo = await logout();

    return NextResponse.json({
      success: true,
      authMethod: logoutInfo.authMethod,
    });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
