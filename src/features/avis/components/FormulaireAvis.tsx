"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { enregistrerAvisAction } from "../actions/avis.actions";
import {
  LONGUEUR_MAX_COMMENTAIRE,
  NOTES_AVIS,
  SUJET_SIMULATEUR,
  demandeUnCommentaire,
  libelleNote,
  questionAvis,
  type EtapeAvis,
  type NoteAvis,
  type OrigineAvis,
} from "../domain/value-objects/avis";

export type CibleAvis =
  | { sujet: EtapeAvis; parcoursId: string }
  | { sujet: typeof SUJET_SIMULATEUR; simulationEligible?: boolean; codeDepartement?: string };

interface FormulaireAvisProps {
  cible: CibleAvis;
  origine: OrigineAvis;
  // Note cliquée dans le mail : enregistrée dès l'affichage, pour compter même si la page est refermée.
  noteInitiale?: NoteAvis;
  onTermine?: () => void;
}

type Etat = "saisie" | "envoi" | "termine";

export function FormulaireAvis({ cible, origine, noteInitiale, onTermine }: FormulaireAvisProps) {
  const id = useId();
  const [note, setNote] = useState<NoteAvis | null>(noteInitiale ?? null);
  const [commentaire, setCommentaire] = useState("");
  const [piege, setPiege] = useState("");
  const [etat, setEtat] = useState<Etat>("saisie");
  const [noteEnregistree, setNoteEnregistree] = useState<NoteAvis | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const avisId = useRef<string | null>(null);
  const dejaEnvoyeAuMontage = useRef(false);

  async function enregistrer(valeur: NoteAvis, texte?: string): Promise<boolean> {
    const resultat = await enregistrerAvisAction({
      ...cible,
      ...(cible.sujet === SUJET_SIMULATEUR && avisId.current ? { avisId: avisId.current } : {}),
      note: valeur,
      commentaire: texte,
      origine,
      ...(piege ? { site: piege } : {}),
    });
    if (!resultat.success) {
      setErreur(resultat.error);
      return false;
    }
    avisId.current = resultat.data.avisId;
    setErreur(null);
    setNoteEnregistree(valeur);
    return true;
  }

  useEffect(() => {
    if (!noteInitiale || dejaEnvoyeAuMontage.current) return;
    dejaEnvoyeAuMontage.current = true;
    void enregistrer(noteInitiale);
    // Un seul envoi, à l'affichage : la note initiale ne change pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function soumettre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note) return;
    setEtat("envoi");
    const ok = await enregistrer(note, demandeUnCommentaire(note) ? commentaire : undefined);
    setEtat(ok ? "termine" : "saisie");
    if (ok) onTermine?.();
  }

  if (etat === "termine") {
    return (
      <div className="fr-alert fr-alert--success" role="status">
        <h2 className="fr-alert__title">Merci pour votre aide !</h2>
        <p>Votre réponse nous permettra d&apos;améliorer nos services.</p>
      </div>
    );
  }

  const envoiEnCours = etat === "envoi";

  return (
    <form onSubmit={soumettre}>
      {noteEnregistree && (
        <div className="fr-alert fr-alert--success fr-alert--sm fr-mb-3w" role="status">
          <p>
            Votre réponse « {libelleNote(noteEnregistree, cible.sujet)} » est enregistrée. Vous pouvez la modifier ou la
            préciser ci-dessous.
          </p>
        </div>
      )}

      <fieldset className="fr-fieldset" aria-labelledby={`${id}-legende`}>
        <legend className="fr-fieldset__legend fr-fieldset__legend--regular" id={`${id}-legende`}>
          {questionAvis(cible.sujet)}
        </legend>
        {NOTES_AVIS.map((valeur) => (
          <div className="fr-fieldset__element" key={valeur}>
            <div className="fr-radio-group">
              <input
                type="radio"
                id={`${id}-note-${valeur}`}
                name={`${id}-note`}
                checked={note === valeur}
                onChange={() => setNote(valeur)}
                disabled={envoiEnCours}
              />
              <label className="fr-label" htmlFor={`${id}-note-${valeur}`}>
                {libelleNote(valeur, cible.sujet)}
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      {note && demandeUnCommentaire(note) && (
        <div className="fr-input-group">
          <label className="fr-label" htmlFor={`${id}-commentaire`}>
            Qu&apos;est-ce qui a posé problème ?
            <span className="fr-hint-text">
              Facultatif. N&apos;indiquez pas d&apos;information personnelle (nom, adresse, téléphone).
            </span>
          </label>
          <textarea
            className="fr-input"
            id={`${id}-commentaire`}
            rows={4}
            maxLength={LONGUEUR_MAX_COMMENTAIRE}
            value={commentaire}
            onChange={(event) => setCommentaire(event.target.value)}
            disabled={envoiEnCours}
          />
        </div>
      )}

      <div className="fr-sr-only" aria-hidden="true">
        <label htmlFor={`${id}-site`}>Ne pas remplir ce champ</label>
        <input
          type="text"
          id={`${id}-site`}
          tabIndex={-1}
          autoComplete="off"
          value={piege}
          onChange={(event) => setPiege(event.target.value)}
        />
      </div>

      {erreur && (
        <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-3w" role="alert">
          <p>{erreur}</p>
        </div>
      )}

      <button type="submit" className="fr-btn" disabled={!note || envoiEnCours}>
        {noteEnregistree ? "Mettre à jour ma réponse" : "Envoyer ma réponse"}
      </button>
    </form>
  );
}
