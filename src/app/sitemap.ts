import type { MetadataRoute } from "next";

import { getAllDepartements, getAllEpcis, getAllCommunes } from "@/features/seo";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://fonds-prevention-argile.beta.gouv.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Pages statiques principales
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/simulateur`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/connexion`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/mentions-legales`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/politique-confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/cgu`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/accessibilite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/documentation/integration-iframe`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Pages travaux-eligibles
  const travauxEligibles = [
    "dispositif-infiltration-eaux",
    "drainage-eaux-deportees",
    "installation-ecran-anti-racine",
    "pose-canalisation-evacuation-eaux-pluviales",
    "pose-membrane-impermeabilite",
    "pose-trottoir-impermeable-peripherique",
    "reperage-fuite-reseaux-eaux",
    "suppression-systemes-racinaires",
    "test-permeabilite-sol",
  ];

  const travauxPages: MetadataRoute.Sitemap = travauxEligibles.map((slug) => ({
    url: `${BASE_URL}/travaux-eligibles/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Page index RGA
  const rgaIndex: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/rga`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Pages départements
  const departements = getAllDepartements();
  const departementsPages: MetadataRoute.Sitemap = departements.map((departement) => ({
    url: `${BASE_URL}/rga/departement/${departement.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Pages EPCI
  const epcis = getAllEpcis();
  const epcisPages: MetadataRoute.Sitemap = epcis.map((epci) => ({
    url: `${BASE_URL}/rga/epci/${epci.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Pages communes
  const communes = getAllCommunes();
  const communesPages: MetadataRoute.Sitemap = communes.map((commune) => ({
    url: `${BASE_URL}/rga/commune/${commune.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...travauxPages,
    ...rgaIndex,
    ...departementsPages,
    ...epcisPages,
    ...communesPages,
  ];
}
