"use client";
import { contentNotFoundPage } from "@/content";
import { richTextParser } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main role="main" id="content">
      <div className="fr-container">
        <div className="fr-my-7w fr-mt-md-12w fr-mb-md-10w fr-grid-row fr-grid-row--gutters fr-grid-row--middle fr-grid-row--center">
          <div className="fr-py-0 fr-col-12 fr-col-md-6">
            <h1>{contentNotFoundPage.title}</h1>
            <p className="fr-text--sm fr-mb-3w">
              {contentNotFoundPage.title_404}
            </p>
            <p className="fr-text--lead fr-mb-3w">
              {contentNotFoundPage.description}
            </p>
            <p className="fr-text--sm fr-mb-5w">
              {richTextParser(contentNotFoundPage.description_2)}
            </p>
            <Link
              className="fr-btn fr-icon-arrow-right-line fr-btn--icon-right"
              href="/"
            >
              {contentNotFoundPage.homepageLinkLabel}
            </Link>
          </div>
          <div className="fr-col-12 fr-col-md-3 fr-col-offset-md-1 fr-px-6w fr-px-md-0 fr-py-0">
            <Image
              alt="Erreur technique"
              className="shrink-0"
              height={150}
              src="/illustrations/technical-error.svg"
              width={150}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
