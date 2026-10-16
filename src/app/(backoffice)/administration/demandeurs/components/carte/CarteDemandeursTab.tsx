"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import {
  codeDepartementDeCommune,
  compterDemandeursParCommune,
  construireCarteCommunes,
  type CentresCommunes,
} from "@/features/backoffice/administration/demandeurs/domain";
import {
  getCentresCommunesAction,
  getContourDepartementAction,
} from "@/features/backoffice/administration/demandeurs/actions";
import type { GeoContourDepartement } from "@/shared/adapters/geo";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { filterUsersByDepartement } from "../filters/departements/departementFilter.utils";
import { filterUsersByPeriode } from "../filters/periode/periodeFilter.utils";
import { excludeArchivedUsers } from "../filters/archivage/archivageFilter.utils";

// maplibre n'a rien à faire dans le bundle des autres onglets.
const CarteDemandeursMap = dynamic(() => import("./CarteDemandeursMap").then((m) => m.CarteDemandeursMap), {
  ssr: false,
  loading: () => <p>Chargement de la carte...</p>,
});

const NOMBRE_COMMUNES_LISTEES = 10;

interface CarteDemandeursTabProps {
  users: UserWithParcoursDetails[];
  periodeId: PeriodeId;
  codeDepartement: string;
  etape: Step | "";
}

export function CarteDemandeursTab({ users, periodeId, codeDepartement, etape }: CarteDemandeursTabProps) {
  const [centres, setCentres] = useState<CentresCommunes>({});
  const [departementsEnEchec, setDepartementsEnEchec] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const codesDemandes = useRef(new Set<string>());
  const [contours, setContours] = useState<Record<string, GeoContourDepartement | null>>({});

  // Un dossier archivé reste sur sa dernière étape : il ferait passer un territoire pour actif.
  const communes = useMemo(() => {
    let filtres = excludeArchivedUsers(filterUsersByPeriode(users, periodeId));
    if (codeDepartement) filtres = filterUsersByDepartement(filtres, codeDepartement);
    if (etape) filtres = filtres.filter((u) => u.parcours?.currentStep === etape);
    return compterDemandeursParCommune(filtres);
  }, [users, periodeId, codeDepartement, etape]);

  // Chaque commune n'est demandée qu'une fois, placée ou non : changer de filtre ne relance rien.
  const cleNouvelles = communes
    .map((c) => c.code)
    .filter((code) => !codesDemandes.current.has(code))
    .join(",");

  useEffect(() => {
    if (!cleNouvelles) return;
    const codes = cleNouvelles.split(",");
    codes.forEach((code) => codesDemandes.current.add(code));
    getCentresCommunesAction(codes).then((resultat) => {
      if (!resultat.success) {
        setErreur(resultat.error);
        return;
      }
      setErreur(null);
      setDepartementsEnEchec(resultat.data.departementsEnEchec);
      setCentres((precedents) => ({ ...precedents, ...resultat.data.centres }));
    });
  }, [cleNouvelles]);

  // Un contour indisponible ne bloque rien : la carte s'affiche, sans tracé.
  useEffect(() => {
    if (!codeDepartement || codeDepartement in contours) return;
    let annule = false;
    getContourDepartementAction(codeDepartement).then((resultat) => {
      if (annule || !resultat.success) return;
      setContours((precedents) => ({ ...precedents, [codeDepartement]: resultat.data }));
    });
    return () => {
      annule = true;
    };
  }, [codeDepartement, contours]);

  const contour = codeDepartement ? (contours[codeDepartement] ?? null) : null;

  const carte = useMemo(() => construireCarteCommunes(communes, centres), [communes, centres]);
  const communesPlacees = useMemo(() => communes.filter((c) => c.code in centres), [communes, centres]);
  const nombreDemandeurs = communesPlacees.reduce((total, c) => total + c.demandeurs, 0);

  return (
    <div>
      <h2 className="fr-h4 fr-mb-1w">
        {nombreDemandeurs.toLocaleString("fr-FR")} demandeur{nombreDemandeurs > 1 ? "s" : ""} dans{" "}
        {communesPlacees.length.toLocaleString("fr-FR")} commune{communesPlacees.length > 1 ? "s" : ""}
      </h2>
      <p className="fr-text--sm fr-mb-3w" style={{ color: "var(--text-mention-grey)" }}>
        Chaque point est placé au centre de la commune du logement, jamais sur l&apos;adresse. Dossiers archivés et
        demandeurs sans commune connue exclus.
      </p>

      {erreur && (
        <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
          <p>{erreur}</p>
        </div>
      )}
      {departementsEnEchec.length > 0 && (
        <div className="fr-alert fr-alert--warning fr-alert--sm fr-mb-2w">
          <p>
            Les communes de {departementsEnEchec.join(", ")} n&apos;ont pas pu être placées : le service de découpage
            administratif ne répond pas. Rechargez la page dans quelques minutes.
          </p>
        </div>
      )}

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-lg-8">
          <div className="bg-(--background-default-grey) fr-p-2w">
            <CarteDemandeursMap carte={carte} contour={contour} />
          </div>
        </div>
        <div className="fr-col-12 fr-col-lg-4">
          <div className="bg-(--background-default-grey) fr-p-3w">
            <h3 className="fr-h6 fr-mb-2w">Communes les plus représentées</h3>
            {communesPlacees.length === 0 ? (
              <p className="fr-mb-0">Aucun demandeur avec ces filtres.</p>
            ) : (
              <ol className="fr-mb-0">
                {communesPlacees.slice(0, NOMBRE_COMMUNES_LISTEES).map((c) => (
                  <li key={c.code}>
                    {c.nom} ({codeDepartementDeCommune(c.code)}) : {c.demandeurs}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
