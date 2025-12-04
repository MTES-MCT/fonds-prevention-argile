"use client";
import Image from "next/image";

export default function InProgress() {
  return (
    <div
      className="fr-container fr-background-default--grey p-12"
      style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="fr-grid-row fr-grid-row--center fr-grid-row--middle">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6" style={{ textAlign: "center" }}>
          <div className="fr-mb-4w">
            <Image
              alt="Erreur technique"
              height={150}
              src="/illustrations/technical-error.svg"
              width={150}
              style={{ margin: "0 auto" }}
            />
          </div>
          <h1>En cours de développement</h1>
          <p className="fr-text--lead fr-mb-3w">
            La page que vous cherchez est en cours de développement. Excusez-nous pour la gêne occasionnée.
          </p>
        </div>
      </div>
    </div>
  );
}
