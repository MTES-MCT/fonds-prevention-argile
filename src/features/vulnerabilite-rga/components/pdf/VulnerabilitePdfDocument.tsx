import { Document, Page, View, Text, Image as PdfImage, StyleSheet, Svg, Polygon } from "@react-pdf/renderer";
import {
  CALLOUT_EXPERT_TITLE,
  CALLOUT_EXPERT_TEXT,
  SOURCES_VULNERABILITE_TITRE,
  SOURCES_VULNERABILITE_INTRO,
  SOURCES_VULNERABILITE_CHAPO,
  SOURCES_VULNERABILITE_ITEMS,
} from "../../domain/value-objects/resultat-content.const";
import type { SectionRecommandations } from "../../domain/services/recommandations.service";
import type { RecommandationDef } from "../../domain/catalogues/recommandations.catalogue";
import type { NiveauSynthese, SyntheseResultat } from "../../domain/services/synthese-resultat.service";
import type { IllustrationsPdf } from "./rasteriser-illustrations";

interface VulnerabilitePdfDocumentProps {
  synthese: SyntheseResultat;
  sections: SectionRecommandations[];
  illustrations: IllustrationsPdf;
}

const BLEU_FRANCE = "#000091";
const ROUGE_MARIANNE = "#E1000F";
const ROUGE_ERREUR = "#CE0500";
const BLEU_ECUME_TEXTE = "#2F4077";
const BLEU_ECUME_FOND = "#E9EDFE";
const GRIS_TEXTE = "#161616";
const GRIS_MENTION = "#666666";

// Fonds des accents DSFR du callout de synthèse (pink-tuile, yellow-moutarde, green-emeraude).
const FONDS_SYNTHESE: Record<NiveauSynthese, { fond: string; bordure: string }> = {
  critique: { fond: "#FEE9E7", bordure: "#CE614A" },
  vigilance: { fond: "#FEEBD0", bordure: "#C3992A" },
  aucun: { fond: "#C3FAD5", bordure: "#00A95F" },
};

const styles = StyleSheet.create({
  // paddingTop : marge des pages suivantes, que l'en-tête de la première compense (marginTop négatif).
  page: { paddingTop: 30, paddingBottom: 48, fontSize: 10, color: GRIS_TEXTE, fontFamily: "Helvetica" },
  tricolore: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", height: 6 },
  tricoloreBand: { flex: 1 },
  header: {
    marginTop: -24,
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottom: `1pt solid #DDDDDD`,
  },
  headerMinistere: { fontSize: 8, color: GRIS_MENTION, marginBottom: 2 },
  headerService: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLEU_FRANCE },
  headerTagline: { fontSize: 8, color: GRIS_MENTION, marginTop: 2 },
  body: { paddingHorizontal: 40, paddingTop: 20 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  date: { fontSize: 8, color: GRIS_MENTION, marginBottom: 16 },
  synthese: { padding: 12, marginBottom: 16 },
  callout: {
    backgroundColor: BLEU_ECUME_FOND,
    borderLeft: `3pt solid ${BLEU_ECUME_TEXTE}`,
    padding: 12,
    marginBottom: 16,
  },
  calloutTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GRIS_TEXTE, marginBottom: 4 },
  calloutText: { fontSize: 9.5, lineHeight: 1.4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  paragraph: { fontSize: 9.5, lineHeight: 1.4, marginBottom: 8 },
  chapo: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  bulletRow: { flexDirection: "row", marginBottom: 3, paddingRight: 4 },
  bullet: { width: 10, fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  bold: { fontFamily: "Helvetica-Bold" },
  card: { border: "1pt solid #DDDDDD", borderRadius: 4, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  cardIllustration: { width: 200, alignSelf: "center", marginBottom: 10 },
  problemeTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  problemeTitle: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  ameliorationBox: { backgroundColor: BLEU_ECUME_FOND, borderRadius: 3, padding: 10, marginTop: 8 },
  ameliorationTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLEU_ECUME_TEXTE, marginBottom: 4 },
  ameliorationBulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4, color: BLEU_ECUME_TEXTE },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: GRIS_MENTION,
    textAlign: "center",
  },
});

function PdfBulletList({ items, textStyle }: { items: string[]; textStyle?: (typeof styles)[keyof typeof styles] }) {
  return (
    <>
      {items.map((item, index) => (
        <View style={styles.bulletRow} key={index} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <Text style={textStyle ?? styles.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

/** Fiche de recommandation ; l'appelant l'enveloppe dans une View `wrap={false}` pour qu'elle ne se coupe pas. */
function PdfFiche({
  recommandation,
  illustrations,
}: {
  recommandation: RecommandationDef;
  illustrations: IllustrationsPdf;
}) {
  const illustration = recommandation.illustrationId ? illustrations[recommandation.illustrationId] : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{recommandation.titre}</Text>
      {illustration && <PdfImage src={illustration} style={styles.cardIllustration} />}

      <View style={styles.problemeTitleRow}>
        {/* Triangle dessiné en SVG plutôt qu'en glyphe unicode : les polices
            standard PDFKit (WinAnsi) n'ont pas "▲". */}
        <Svg width={9} height={9} style={{ marginRight: 5 }} viewBox="0 0 10 10">
          <Polygon points="5,0 10,10 0,10" fill={ROUGE_ERREUR} />
        </Svg>
        <Text style={styles.problemeTitle}>Problème</Text>
      </View>
      <PdfBulletList items={recommandation.problemes} />

      <View style={styles.ameliorationBox}>
        <Text style={styles.ameliorationTitle}>Amélioration conseillée :</Text>
        <PdfBulletList items={recommandation.ameliorations} textStyle={styles.ameliorationBulletText} />
      </View>
    </View>
  );
}

/**
 * En-tête au format des sites .gouv.fr (bandeau tricolore + Ministère + nom du service),
 * pour que le lecteur se souvienne d'où vient le document une fois imprimé/partagé —
 * reconstitué en primitives PDF, le DSFR (CSS) n'étant pas disponible dans ce rendu.
 */
function PdfHeader() {
  return (
    <>
      <View style={styles.tricolore} fixed>
        <View style={[styles.tricoloreBand, { backgroundColor: BLEU_FRANCE }]} />
        <View style={[styles.tricoloreBand, { backgroundColor: "#FFFFFF" }]} />
        <View style={[styles.tricoloreBand, { backgroundColor: ROUGE_MARIANNE }]} />
      </View>
      <View style={styles.header}>
        <Text style={styles.headerMinistere}>RÉPUBLIQUE FRANÇAISE — Ministère de la Transition écologique</Text>
        <Text style={styles.headerService}>Fonds Prévention Argile</Text>
        <Text style={styles.headerTagline}>Retrait-Gonflement des Argiles — Aides aux ménages</Text>
      </View>
    </>
  );
}

/**
 * PDF téléchargeable depuis l'écran de résultat du simulateur de vulnérabilité : synthèse,
 * callout d'avertissement (sans le CTA vers `/simulateur`, hors-sujet une fois imprimé),
 * pédagogie RGA et recommandations par section. Synthèse, sections et textes sont ceux du
 * rendu HTML (`resultat-content.const.ts`), pour ne jamais diverger.
 */
export function VulnerabilitePdfDocument({ synthese, sections, illustrations }: VulnerabilitePdfDocumentProps) {
  const dateGeneration = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Document title="Résultat de ma simulation de vulnérabilité RGA">
      <Page size="A4" style={styles.page}>
        <PdfHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Résultat de votre simulation de vulnérabilité RGA</Text>
          <Text style={styles.date}>Généré le {dateGeneration}</Text>

          <View
            wrap={false}
            style={[
              styles.synthese,
              {
                backgroundColor: FONDS_SYNTHESE[synthese.niveau].fond,
                borderLeft: `3pt solid ${FONDS_SYNTHESE[synthese.niveau].bordure}`,
              },
            ]}>
            <Text style={styles.calloutTitle}>{synthese.titre}</Text>
            <Text style={styles.calloutText}>{synthese.texte}</Text>
          </View>

          <View style={styles.callout} wrap={false}>
            <Text style={styles.calloutTitle}>{CALLOUT_EXPERT_TITLE}</Text>
            <Text style={styles.calloutText}>{CALLOUT_EXPERT_TEXT}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{SOURCES_VULNERABILITE_TITRE}</Text>
            <Text style={styles.paragraph}>{SOURCES_VULNERABILITE_INTRO}</Text>
            <Text style={styles.chapo}>{SOURCES_VULNERABILITE_CHAPO}</Text>
            {SOURCES_VULNERABILITE_ITEMS.map((item) => (
              <View style={styles.bulletRow} key={item.label} wrap={false}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bold}>{item.label}</Text> : {item.texte}
                </Text>
              </View>
            ))}
          </View>

          {sections.map((section) => {
            const [premiere, ...suivantes] = section.recommandations;
            const pointsSansCarte = (
              <PdfBulletList items={section.pointsSansCarte.map((point) => `${point.question} : ${point.reponse}`)} />
            );

            return (
              <View style={styles.section} key={section.categorie}>
                {/* Le titre voyage avec sa première fiche : jamais seul en bas de page. */}
                <View wrap={false}>
                  <Text style={styles.sectionTitle}>{section.titre}</Text>
                  {section.explication && <Text style={styles.paragraph}>{section.explication}</Text>}
                  {premiere ? <PdfFiche recommandation={premiere} illustrations={illustrations} /> : pointsSansCarte}
                </View>
                {suivantes.map((recommandation) => (
                  <View key={recommandation.id} wrap={false}>
                    <PdfFiche recommandation={recommandation} illustrations={illustrations} />
                  </View>
                ))}
                {premiere && pointsSansCarte}
              </View>
            );
          })}
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Fonds Prévention Argile — fonds-prevention-argile.beta.gouv.fr — page ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
