"use client";

import { useState } from "react";
import { UserWithParcoursDetails } from "@/features/backoffice";
import { UserDetailParcours } from "./details/UserDetailParcours";
import { UserDetailUser } from "./details/UserDetailUser";
import { UserDetailSimulation } from "./details/UserDetailSimulation";
import { UserDetailAmo } from "./details/UserDetailAmo";

interface UserDetailRowProps {
  user: UserWithParcoursDetails;
}

type DetailView = "parcours" | "user" | "simulation" | "amo";

export function UserDetailRow({ user }: UserDetailRowProps) {
  const [activeView, setActiveView] = useState<DetailView>("parcours");

  return (
    <div className="fr-p-4w">
      {/* Contrôle segmenté pour choisir la vue */}
      <div className="fr-mb-4w">
        <div className="fr-segmented fr-segmented--no-legend" role="tablist">
          <div className="fr-segmented__elements">
            <div className="fr-segmented__element">
              <input
                type="radio"
                id={`view-parcours-${user.user.id}`}
                name={`view-${user.user.id}`}
                checked={activeView === "parcours"}
                onChange={() => setActiveView("parcours")}
              />
              <label className="fr-label" htmlFor={`view-parcours-${user.user.id}`}>
                <span className="fr-icon-road-map-line fr-mr-1w" aria-hidden="true" />
                Parcours
              </label>
            </div>
            <div className="fr-segmented__element">
              <input
                type="radio"
                id={`view-user-${user.user.id}`}
                name={`view-${user.user.id}`}
                checked={activeView === "user"}
                onChange={() => setActiveView("user")}
              />
              <label className="fr-label" htmlFor={`view-user-${user.user.id}`}>
                <span className="fr-icon-user-line fr-mr-1w" aria-hidden="true" />
                Utilisateur
              </label>
            </div>
            <div className="fr-segmented__element">
              <input
                type="radio"
                id={`view-simulation-${user.user.id}`}
                name={`view-${user.user.id}`}
                checked={activeView === "simulation"}
                onChange={() => setActiveView("simulation")}
              />
              <label className="fr-label" htmlFor={`view-simulation-${user.user.id}`}>
                <span className="fr-icon-home-4-line fr-mr-1w" aria-hidden="true" />
                Simulation
              </label>
            </div>
            <div className="fr-segmented__element">
              <input
                type="radio"
                id={`view-amo-${user.user.id}`}
                name={`view-${user.user.id}`}
                checked={activeView === "amo"}
                onChange={() => setActiveView("amo")}
              />
              <label className="fr-label" htmlFor={`view-amo-${user.user.id}`}>
                <span className="fr-icon-team-line fr-mr-1w" aria-hidden="true" />
                AMO
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu selon la vue active */}
      <div>
        {activeView === "parcours" && <UserDetailParcours user={user} />}
        {activeView === "user" && <UserDetailUser user={user} />}
        {activeView === "simulation" && <UserDetailSimulation user={user} />}
        {activeView === "amo" && <UserDetailAmo user={user} />}
      </div>
    </div>
  );
}
