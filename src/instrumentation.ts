export async function register() {
  // Forme imposée par Next : l'import reste hors du bundle edge (middleware), qui n'a ni fs ni inspector.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { demarrerReleveMemoire } = await import("@/shared/services/releve-memoire/releve-memoire.service");
    await demarrerReleveMemoire();
  }
}
