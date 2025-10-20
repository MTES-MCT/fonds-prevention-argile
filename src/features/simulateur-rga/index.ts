// Domain
export * from "./domain/entities";

// Services
export { parseRGAParams } from "./services/parser.service";
export { validateRGAData } from "./services/validator.service";

// Context & Provider & Hook (valeurs)
export { RGAProvider, useRGAContext } from "./context";

// Types (exports séparés)
export type { RGAContextType } from "./context";

// Components
export { SimulateurClient, RGATestFiller } from "./components";
