"use client";

import { useState, useEffect } from "react";
import { Step, DSStatus } from "@/lib/parcours/parcours.types";
import { obtenirMonParcours } from "@/lib/actions/parcours/parcours.actions";

interface UseDossierDSOptions {
  step: Step;
  status?: DSStatus;
}

export function useDossierDS({ step, status }: UseDossierDSOptions) {
  const [dsUrl, setDsUrl] = useState<string | null>(null);
  const [dsNumber, setDsNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDossier = async () => {
      try {
        setIsLoading(true);
        const result = await obtenirMonParcours();

        if (!result.success || !result.data) {
          setError("Impossible de récupérer le parcours");
          return;
        }

        // Trouver le dossier correspondant à l'étape et au statut
        const dossier = result.data.dossiers.find((d) => {
          const matchStep = d.step === step;
          const matchStatus = status ? d.dsStatus === status : true;
          return matchStep && matchStatus;
        });

        if (dossier) {
          setDsUrl(dossier.dsUrl || null);
          setDsNumber(dossier.dsNumber || null);
        } else {
          setError("Aucun dossier trouvé pour cette étape");
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du dossier:", err);
        setError("Erreur lors de la récupération du dossier");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDossier();
  }, [step, status]);

  return {
    dsUrl,
    dsNumber,
    isLoading,
    error,
    refetch: () => {
      setError(null);
      const fetchDossier = async () => {
        try {
          setIsLoading(true);
          const result = await obtenirMonParcours();

          if (!result.success || !result.data) {
            setError("Impossible de récupérer le parcours");
            return;
          }

          const dossier = result.data.dossiers.find((d) => {
            const matchStep = d.step === step;
            const matchStatus = status ? d.dsStatus === status : true;
            return matchStep && matchStatus;
          });

          if (dossier) {
            setDsUrl(dossier.dsUrl || null);
            setDsNumber(dossier.dsNumber || null);
          }
        } catch (err) {
          console.error("Erreur lors de la récupération du dossier:", err);
          setError("Erreur lors de la récupération du dossier");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDossier();
    },
  };
}
