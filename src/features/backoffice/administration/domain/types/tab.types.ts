export type TabId =
  | "statistiques"
  | "users"
  | "agents"
  | "amo"
  | "allers-vers"
  | "eligibilite"
  | "diagnostic"
  | "devis"
  | "factures";

export interface AdminTab {
  id: TabId;
  label: string;
  icon: string;
  superAdminOnly?: boolean;
}
