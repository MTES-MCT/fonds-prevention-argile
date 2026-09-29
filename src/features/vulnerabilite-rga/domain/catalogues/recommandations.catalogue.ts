export interface RecommandationDef {
  id: string;
  /** Critère de la grille (`grille-ponderation.ts`) qui déclenche cette fiche. */
  critereId: string;
  /** Réponses de ce critère qui déclenchent la fiche. */
  reponsesDeclenchantes: string[];
  titre: string;
  /** Pourquoi c'est un problème pour le RGA — section "Problème" de `RecommandationCard`. */
  problemes: string[];
  /** Ce qu'il est recommandé de faire — section "Amélioration conseillée" de `RecommandationCard`. */
  ameliorations: string[];
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
    problemes: [
      "Une pente qui descend vers la maison ramène l'eau de pluie contre la façade à chaque orage, provoquant des cycles de gonflement et de retrait du sol argileux juste sous les fondations",
    ],
    ameliorations: [
      "Créer une pente légère qui éloigne l'eau de pluie de la maison plutôt que vers elle",
      "Installer un caniveau ou une noue le long de la façade concernée",
      "Installer un système de drainage pour éviter l'accumulation de l'eau en pied de façade",
    ],
    illustrationId: "pente",
  },
  {
    id: "eaux-reseaux",
    critereId: "reseaux_enterres",
    reponsesDeclenchantes: ["proches", "sous_fondations", "ne_sais_pas"],
    titre: "Faire vérifier l'étanchéité des réseaux enterrés",
    problemes: [
      "Une fuite d'eau ou d'assainissement près des fondations est l'une des causes les plus fréquentes de sinistre RGA",
    ],
    ameliorations: [
      "Faire contrôler l'étanchéité des canalisations proches de la maison par un professionnel",
      "Envisager, si possible, d'éloigner les réseaux des fondations lors de travaux futurs",
    ],
    illustrationId: "reseaux",
  },
  {
    id: "eaux-gravier-tout-pourtour",
    critereId: "gravier_proprete",
    reponsesDeclenchantes: ["present_tout_pourtour"],
    titre: "Revoir le gravier de propreté sur tout le pourtour de la maison",
    problemes: [
      "Sans membrane étanche dessous, le gravier laisse l'eau s'infiltrer directement au pied du mur",
      "Sur tout le pourtour, ces infiltrations répétées provoquent des cycles gonflement/retrait sur l'ensemble des fondations; le risque d'un tassement différentiel généralisé est plus élevé qu'un point localisé",
    ],
    ameliorations: [
      "Faire vérifier la présence d'une membrane étanche sur tout le tour, ou remplacer par un dispositif qui éloigne l'eau du mur",
    ],
    illustrationId: "gravier",
  },
  {
    id: "eaux-gravier-localise",
    critereId: "gravier_proprete",
    reponsesDeclenchantes: ["present_localise"],
    titre: "Revoir le gravier de propreté aux endroits concernés",
    problemes: [
      "Sans membrane étanche dessous, le gravier laisse l'eau s'infiltrer directement au pied du mur",
      "Limitées à quelques endroits, ces infiltrations créent un risque localisé de tassement différentiel à ces points précis",
    ],
    ameliorations: [
      "Faire vérifier la présence d'une membrane étanche aux endroits concernés, ou remplacer par un dispositif qui éloigne l'eau du mur",
    ],
    illustrationId: "gravier",
  },
  {
    id: "eaux-gouttieres",
    critereId: "gouttieres",
    reponsesDeclenchantes: ["absentes_ou_debordantes", "entretenues_evacuation_proche", "ne_sais_pas"],
    titre: "Entretenir les gouttières et éloigner leur évacuation",
    problemes: ["Des gouttières bouchées ou absentes déversent l'eau de pluie directement contre le mur"],
    ameliorations: [
      "Nettoyer les gouttières au moins une fois par an",
      "Vérifier que la descente évacue l'eau loin des fondations (regard, drain, ou raccordement)",
    ],
    illustrationId: "gouttieres",
  },
  {
    id: "eaux-recuperateur",
    critereId: "recuperateur_eau",
    reponsesDeclenchantes: ["present_fuite_ou_mal_raccorde", "ne_sais_pas"],
    titre: "Vérifier le raccordement et l'étanchéité du récupérateur d'eau",
    problemes: [
      "Collé à la descente de gouttière, un récupérateur d'eau est presque toujours en pied de façade",
      "S'il fuit ou est mal raccordé, il déverse l'eau directement contre le mur, avec le même effet qu'une gouttière défaillante",
    ],
    ameliorations: [
      "Vérifier régulièrement l'étanchéité de la cuve et du raccordement à la descente de gouttière",
      "En cas de trop-plein, s'assurer qu'il évacue loin des fondations plutôt que de déborder au pied du mur",
    ],
    illustrationId: "recuperateur-eau",
  },
  {
    id: "veg-arbre",
    critereId: "arbre_essence",
    reponsesDeclenchantes: ["peuplier", "saule", "chene", "frene", "bouleau", "erable", "autre", "ne_sais_pas"],
    titre: "Faire expertiser l'arbre proche des fondations",
    problemes: ["Les racines d'un arbre proche assèchent le sol à son pied, ce qui accentue le retrait argileux"],
    ameliorations: [
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
    problemes: ["Une haie dense et proche de la maison assèche le sol comme le ferait un arbre"],
    ameliorations: [
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
    problemes: [
      "Potager, rosiers ou arbustes contre le mur imposent des arrosages répétés juste au pied des fondations",
      "Ces apports d'eau localisés et irréguliers sont particulièrement défavorables sur sol argileux",
    ],
    ameliorations: [
      "Éloigner ces plantations d'au moins 1 à 2 mètres de la façade, ou les remplacer par un massif sans arrosage",
    ],
    illustrationId: "pied-facade",
  },
  {
    id: "divers-mitoyennete",
    critereId: "mitoyennete",
    reponsesDeclenchantes: ["mitoyen_voisin_sans_travaux"],
    titre: "Échanger avec le voisin mitoyen sur la prévention RGA",
    problemes: ["Sur une maison mitoyenne, les mouvements de sol du côté du voisin peuvent affecter votre propre bâti"],
    ameliorations: [
      "Partager cette information avec le voisin et l'inviter à faire le même diagnostic",
      "Une prévention efficace sur ce type de risque se joue souvent à l'échelle de plusieurs maisons",
    ],
  },
  {
    id: "divers-ensoleillement",
    critereId: "ensoleillement",
    reponsesDeclenchantes: ["fort_sud"],
    titre: "Limiter le dessèchement du sol en façade sud",
    problemes: ["Une exposition sud sans protection accélère l'évaporation de l'eau du sol, donc son retrait"],
    ameliorations: [
      "Une voile d'ombrage ou un paillage au pied de la façade limite l'évaporation directe",
      "Un arrosage léger et régulier en période de sécheresse peut aider à stabiliser l'humidité du sol (à éviter en cas d'arrêté sécheresse)",
    ],
    illustrationId: "ensoleillement",
  },
];
