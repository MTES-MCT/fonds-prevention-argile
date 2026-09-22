const SCHEME_ATTRIBUTE = "data-fr-scheme";
const SCHEME_STORAGE_KEY = "scheme";
const SCHEMES_VALIDES = ["light", "dark", "system"] as const;

type DsfrScheme = (typeof SCHEMES_VALIDES)[number];

function isSchemeValide(valeur: string | null): valeur is DsfrScheme {
  return valeur !== null && (SCHEMES_VALIDES as readonly string[]).includes(valeur);
}

// DSFR fait primer `localStorage.scheme` sur l'attribut `data-fr-scheme` du layout :
// sans ce réalignement, une préférence stockée avant le forçage en clair survit indéfiniment.
export function syncStoredScheme(): void {
  if (typeof document === "undefined") return;

  const schemeDocument = document.documentElement.getAttribute(SCHEME_ATTRIBUTE);
  if (!isSchemeValide(schemeDocument)) return;

  try {
    if (localStorage.getItem(SCHEME_STORAGE_KEY) !== schemeDocument) {
      localStorage.setItem(SCHEME_STORAGE_KEY, schemeDocument);
    }
  } catch {
    // Stockage indisponible (navigation privée, cookies bloqués) : DSFR retombe alors sur l'attribut.
  }
}
