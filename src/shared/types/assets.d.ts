// Déclarations ambiantes pour les imports CSS "side-effect" (ex: import "...min.css").
// TypeScript 6.0 active `noUncheckedSideEffectImports` par défaut et exige une
// déclaration de module pour ces imports sans type. Ce fichier doit rester un
// script (sans import/export) pour que les wildcards soient visibles globalement.
declare module "*.css";
