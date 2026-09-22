/**
 * maplibre 6 exige WebGL2 et, contrairement à la v5, son constructeur ne lève plus quand le
 * contexte manque : il laisse `painter` indéfini, et c'est `map.remove()` qui casse ensuite
 * toute la page. On teste donc la disponibilité avant d'instancier quoi que ce soit.
 */
export function testerWebgl2(canvas: HTMLCanvasElement): boolean {
  try {
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    // Le contexte de test compte dans le quota du navigateur : le rendre immédiatement.
    const perte = gl.getExtension("WEBGL_lose_context") as { loseContext?: () => void } | null;
    perte?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}

let disponibilite: boolean | null = null;

/** Résultat mémoïsé : la réponse ne change pas au cours d'une session de navigation. */
export function webgl2EstDisponible(): boolean {
  if (typeof document === "undefined") return false;
  disponibilite ??= testerWebgl2(document.createElement("canvas"));
  return disponibilite;
}
