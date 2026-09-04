export interface RecommandationDef {
  id: string;
  /** Critère de la grille (`grille-ponderation.ts`) qui déclenche cette fiche. */
  critereId: string;
  /** Réponses de ce critère qui déclenchent la fiche. */
  reponsesDeclenchantes: string[];
  titre: string;
  /** Explication en bullet points, affichés tels quels dans `RecommandationCard`. */
  bullets: string[];
  /** Clé du composant SVG dans `components/illustrations` (réutilise celle de la question). */
  illustrationId?: string;
}

/**
 * Catalogue des recommandations. Aucune entrée ne doit référencer un critère de la
 * catégorie "sol" (aléa RGA) : ce n'est pas actionnable par le propriétaire — vérifié
 * par `recommandations.catalogue.test.ts`.
 */
export const RECOMMANDATIONS_CATALOGUE: RecommandationDef[] = [
  {
    id: "eaux-pente",
    critereId: "pente_terrain",
    reponsesDeclenchantes: ["vers_facade", "ne_sais_pas"],
    titre: "Détourner les eaux de ruissellement de la façade",
    bullets: [
      "Créer une pente légère qui éloigne l'eau de pluie de la maison plutôt que vers elle",
      "Installer un caniveau ou une noue le long de la façade concernée",
      "Éviter que l'eau stagne au même endroit après chaque pluie",
    ],
    illustrationId: "pente",
  },
  {
    id: "eaux-reseaux",
    critereId: "reseaux_enterres",
    reponsesDeclenchantes: ["proches", "sous_fondations", "ne_sais_pas"],
    titre: "Faire vérifier l'étanchéité des réseaux enterrés",
    bullets: [
      "Une fuite d'eau ou d'assainissement près des fondations est l'une des causes les plus fréquentes de sinistre RGA",
      "Faire contrôler l'étanchéité des canalisations proches de la maison par un professionnel",
      "Envisager, si possible, d'éloigner les réseaux des fondations lors de travaux futurs",
    ],
    illustrationId: "reseaux",
  },
  {
    id: "eaux-gravier",
    critereId: "gravier_proprete",
    reponsesDeclenchantes: ["present"],
    titre: "Revoir le gravier de propreté en pied de façade",
    bullets: [
      "Sans membrane étanche dessous, le gravier laisse l'eau s'infiltrer directement au pied du mur",
      "Ces infiltrations répétées provoquent des cycles gonflement/retrait du sol contre les fondations",
      "Faire vérifier la présence d'une membrane étanche, ou remplacer par un dispositif qui éloigne l'eau du mur",
    ],
    illustrationId: "gravier",
  },
  {
    id: "eaux-gouttieres",
    critereId: "gouttieres",
    reponsesDeclenchantes: ["absentes_ou_debordantes", "entretenues_evacuation_proche", "ne_sais_pas"],
    titre: "Entretenir les gouttières et éloigner leur évacuation",
    bullets: [
      "Des gouttières bouchées ou absentes déversent l'eau de pluie directement contre le mur",
      "Nettoyer les gouttières au moins une fois par an",
      "Vérifier que la descente évacue l'eau loin des fondations (regard, drain, ou raccordement)",
    ],
    illustrationId: "gouttieres",
  },
  {
    id: "veg-arbre",
    critereId: "arbre_essence",
    reponsesDeclenchantes: ["peuplier", "saule", "chene", "frene", "bouleau", "erable", "autre", "ne_sais_pas"],
    titre: "Faire expertiser l'arbre proche des fondations",
    bullets: [
      "Les racines d'un arbre proche assèchent le sol à son pied, ce qui accentue le retrait argileux",
      "Faire évaluer par un professionnel si un élagage régulier ou une barrière anti-racines suffit",
      "L'abattage n'est pas toujours la meilleure solution : un arbre supprimé brutalement peut au contraire déséquilibrer l'humidité du sol",
    ],
    illustrationId: "arbre",
  },
  {
    id: "veg-haies",
    critereId: "haies",
    reponsesDeclenchantes: ["proches_moyennement_denses", "proches_denses", "ne_sais_pas"],
    titre: "Éloigner ou espacer la haie des fondations",
    bullets: [
      "Une haie dense et proche de la maison assèche le sol comme le ferait un arbre",
      "Tailler régulièrement pour limiter le développement des racines",
      "Privilégier une distance de plantation d'au moins quelques mètres pour toute nouvelle haie",
    ],
    illustrationId: "haies",
  },
  {
    id: "veg-pied-facade",
    critereId: "vegetation_pied_facade",
    reponsesDeclenchantes: ["presente"],
    titre: "Supprimer la végétation en pied de façade",
    bullets: [
      "Potager, rosiers ou arbustes contre le mur imposent des arrosages répétés juste au pied des fondations",
      "Ces apports d'eau localisés et irréguliers sont particulièrement défavorables sur sol argileux",
      "Éloigner ces plantations d'au moins 1 à 2 mètres de la façade, ou les remplacer par un massif sans arrosage",
    ],
    illustrationId: "pied-facade",
  },
  {
    id: "divers-mitoyennete",
    critereId: "mitoyennete",
    reponsesDeclenchantes: ["mitoyen_voisin_sans_travaux"],
    titre: "Échanger avec le voisin mitoyen sur la prévention RGA",
    bullets: [
      "Sur une maison mitoyenne, les mouvements de sol du côté du voisin peuvent affecter votre propre bâti",
      "Partager cette information avec le voisin et l'inviter à faire le même diagnostic",
      "Une prévention efficace sur ce type de risque se joue souvent à l'échelle de plusieurs maisons",
    ],
  },
  {
    id: "divers-ensoleillement",
    critereId: "ensoleillement",
    reponsesDeclenchantes: ["fort_sud"],
    titre: "Limiter le dessèchement du sol en façade sud",
    bullets: [
      "Une exposition sud sans protection accélère l'évaporation de l'eau du sol, donc son retrait",
      "Un paillage au pied de la façade limite l'évaporation directe",
      "Un arrosage léger et régulier en période de sécheresse peut aider à stabiliser l'humidité du sol (à éviter en cas d'arrêté sécheresse)",
    ],
    illustrationId: "ensoleillement",
  },
];
