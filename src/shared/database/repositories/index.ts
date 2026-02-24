export { BaseRepository } from "./base.repository";
export type { PaginationParams, PaginationResult } from "./base.repository";

export { userRepository as userRepo } from "./user.repository";
export { parcoursPreventionRepository as parcoursRepo } from "./parcours-prevention.repository";
export { parcoursCommentairesRepo } from "./parcours-commentaires.repository";
export { dossierDemarchesSimplifieesRepository as dossierDsRepo } from "./dossiers-demarches-simplifiees.repository";
export { entreprisesAmoRepository as entreprisesAmoRepo } from "./entreprises-amo.repository";
export { agentsRepository as agentsRepo } from "./agents.repository";
export { agentPermissionsRepository } from "./agent-permissions.repository";
export { allersVersRepository } from "./allers-vers.repository";
export { catastrophesNaturellesRepository } from "./catastrophes-naturelles.repository";
export { prospectQualificationsRepo } from "./prospect-qualifications.repository";
