import { getCurrentUser, isAuthenticated, AUTH_METHODS } from "@/features/auth";
import { userRepo, agentPermissionsRepository } from "@/shared/database";
import { agentsRepo } from "@/shared/database/repositories";
import { UserRole } from "@/shared/domain/value-objects";
import {
  canAccessAdministration,
  canAccessEspaceAgent,
} from "@/features/auth/permissions/services/backoffice-access.service";
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

      // Capacités d'accès backoffice pour la navigation unifiée (ADR-0015).
      // L'analyste départemental (au moins un département) accède à l'espace agent ;
      // le national en est exclu — on ne lit les départements que pour ce rôle.
      const analysteHasDepartements =
        user.role === UserRole.ANALYSTE
          ? (await agentPermissionsRepository.getDepartementsByAgentId(user.id)).length > 0
          : false;

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          firstName: user.firstName ?? agent?.givenName,
          lastName: user.lastName ?? agent?.usualName,
          email: agent?.email ?? null,
          role: user.role,
          authMethod: user.authMethod,
          canAccessAdministration: canAccessAdministration(user.role),
          canAccessEspaceAgent: canAccessEspaceAgent(user.role, analysteHasDepartements),
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
