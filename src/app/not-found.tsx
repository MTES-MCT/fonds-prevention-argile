"use client";
import { richTextParser } from "@/utils";
import wording from "@/wording";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main role="main" id="content">
      <div className="fr-container">
        <div className="fr-my-7w fr-mt-md-12w fr-mb-md-10w fr-grid-row fr-grid-row--gutters fr-grid-row--middle fr-grid-row--center">
          <div className="fr-py-0 fr-col-12 fr-col-md-6">
            <h1>{wording.not_found.title}</h1>
            <p className="fr-text--sm fr-mb-3w">
              {wording.not_found.title_404}
            </p>
            <p className="fr-text--lead fr-mb-3w">
              {wording.not_found.description}
            </p>
            <p className="fr-text--sm fr-mb-5w">
              {richTextParser(wording.not_found.description_2)}
            </p>
            <ul className="fr-btns-group fr-btns-group--inline-md">
              <li>
                <Link className="fr-btn" href="/">
                  {wording.not_found.homepageLinkLabel}
                </Link>
              </li>
            </ul>
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
