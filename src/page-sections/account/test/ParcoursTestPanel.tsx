// import { useState, useEffect } from "react";
// import {
//   initierParcours,
//   obtenirMonParcours,
//   enregistrerDossierDS,
//   avancerParcours,
//   obtenirResumeParcours,
// } from "@/lib/actions/parcours.actions";
// import {
//   ParcoursData,
//   ResultParcours,
//   SessionInfo,
// } from "@/lib/database/schema";

// export default function ParcoursTestPanel() {
//   const [isLoading, setIsLoading] = useState(false);

//   const [result, setResult] = useState<ResultParcours | null>(null);
//   const [parcours, setParcours] = useState<ParcoursData | null>(null);
//   const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

//   // Charger les infos de session au montage
//   useEffect(() => {
//     fetchSessionInfo();
//   }, []);

//   const fetchSessionInfo = async () => {
//     try {
//       const res = await fetch("/api/debug/session");
//       const data = await res.json();
//       setSessionInfo(data);
//     } catch (error) {
//       console.error("Erreur récupération session:", error);
//     }
//   };

//   const testInitierParcours = async () => {
//     setIsLoading(true);
//     setResult(null);
//     try {
//       const res = await initierParcours();
//       // Adapt currentStep: null to currentStep: undefined for ResultParcours compatibility
//       if (res.success && res.data && res.data.currentStep === null) {
//         setResult({
//           ...res,
//           data: {
//             ...res.data,
//             currentStep: undefined,
//           },
//         });
//       } else {
//         if (res.success && res.data && res.data.currentStep === null) {
//           setResult({
//             ...res,
//             data: {
//               ...res.data,
//               currentStep: undefined,
//             },
//           });
//         } else {
//           if (res.success && res.data && res.data.currentStep === null) {
//             setResult({
//               ...res,
//               data: {
//                 ...res.data,
//                 currentStep: undefined,
//               },
//             });
//           } else {
//             setResult(res);
//           }
//         }
//       }
//       if (res.success) {
//         await refreshParcours();
//       }
//     } catch (error) {
//       setResult({
//         error: error instanceof Error ? error.message : String(error),
//         success: false,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const testObtenirParcours = async () => {
//     setIsLoading(true);
//     setResult(null);
//     try {
//       const res = await obtenirMonParcours();
//       setResult(res);
//       if (res.success) {
//         setParcours(res.data);
//       }
//     } catch (error) {
//       setResult({
//         error: error instanceof Error ? error.message : String(error),
//         success: false,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const testEnregistrerDossier = async (step: string) => {
//     setIsLoading(true);
//     setResult(null);
//     try {
//       // Simuler un numéro de dossier DS
//       const dsNumber = `TEST-${Date.now()}`;
//       const res = await enregistrerDossierDS(
//         step as any,
//         dsNumber,
//         "12345", // ID démarche test
//         "https://demarches-simplifiees.fr/test"
//       );
//       setResult(res);
//       if (res.success) {
//         await refreshParcours();
//       }
//     } catch (error) {
//       setResult({
//         error: error instanceof Error ? error.message : String(error),
//         success: false,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const testAvancerParcours = async () => {
//     setIsLoading(true);
//     setResult(null);
//     try {
//       const res = await avancerParcours();
//       setResult(res);
//       if (res.success) {
//         await refreshParcours();
//       }
//     } catch (error) {
//       setResult({
//         error: error instanceof Error ? error.message : String(error),
//         success: false,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const testResumeParcours = async () => {
//     setIsLoading(true);
//     setResult(null);
//     try {
//       const res = await obtenirResumeParcours();
//       // Adapt currentStep: null to currentStep: undefined for ResultParcours compatibility
//       if (res.success && res.data && res.data.currentStep === null) {
//         setResult({
//           ...res,
//           data: {
//             ...res.data,
//             currentStep: undefined,
//           },
//         });
//       } else {
//         setResult(res);
//       }
//     } catch (error) {
//       setResult({
//         error: error instanceof Error ? error.message : String(error),
//         success: false,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const refreshParcours = async () => {
//     const res = await obtenirMonParcours();
//     if (res.success) {
//       setParcours(res.data);
//     }
//   };

//   const testReconnexion = () => {
//     window.location.href = "/api/auth/fc/logout";
//   };

//   return (
//     <div className="fr-callout fr-callout--brown-caramel fr-mb-4w">
//       <h3 className="fr-callout__title">🧪 Zone de test (DEV uniquement)</h3>

//       {/* Infos de session */}
//       <div className="fr-mb-2w">
//         <p className="fr-text--sm fr-mb-1w">
//           <strong>Session actuelle :</strong>
//         </p>
//         {sessionInfo && (
//           <ul className="fr-text--xs">
//             <li>UserId: {sessionInfo.session?.userId}</li>
//             <li>Rôle: {sessionInfo.session?.role}</li>
//             <li>
//               Expire:{" "}
//               {new Date(sessionInfo.session?.expiresAt ?? "").toLocaleString()}
//             </li>
//           </ul>
//         )}
//       </div>

//       {/* État du parcours */}
//       {parcours && (
//         <div
//           className="fr-mb-2w fr-p-2w"
//           style={{ backgroundColor: "#f6f6f6" }}
//         >
//           <p className="fr-text--sm fr-mb-1w">
//             <strong>État du parcours :</strong>
//           </p>
//           <ul className="fr-text--xs">
//             <li>ID: {parcours.parcours?.id}</li>
//             <li>Étape: {parcours.parcours?.currentStep}</li>
//             <li>Statut: {parcours.parcours?.currentStatus}</li>
//             <li>Progression: {parcours.progression}%</li>
//             <li>Dossiers DS: {parcours.dossiers?.length || 0}</li>
//           </ul>
//         </div>
//       )}

//       {/* Boutons de test */}
//       <div className="fr-btns-group fr-btns-group--sm">
//         <button
//           className="fr-btn fr-btn--secondary fr-btn--sm"
//           onClick={testInitierParcours}
//           disabled={isLoading}
//         >
//           1. Initialiser parcours
//         </button>

//         <button
//           className="fr-btn fr-btn--secondary fr-btn--sm"
//           onClick={testObtenirParcours}
//           disabled={isLoading}
//         >
//           2. Récupérer parcours
//         </button>
//       </div>

//       {parcours && (
//         <div className="fr-btns-group fr-btns-group--sm fr-mt-2w">
//           <button
//             className="fr-btn fr-btn--secondary fr-btn--sm"
//             onClick={() =>
//               testEnregistrerDossier(parcours.parcours.currentStep)
//             }
//             disabled={isLoading}
//           >
//             3. Simuler dossier DS ({parcours.parcours.currentStep})
//           </button>

//           <button
//             className="fr-btn fr-btn--secondary fr-btn--sm"
//             onClick={testAvancerParcours}
//             disabled={isLoading || parcours.parcours.currentStatus !== "VALIDE"}
//           >
//             4. Progresser
//           </button>
//         </div>
//       )}

//       <div className="fr-btns-group fr-btns-group--sm fr-mt-2w">
//         <button
//           className="fr-btn fr-btn--secondary fr-btn--sm"
//           onClick={testResumeParcours}
//           disabled={isLoading}
//         >
//           Résumé dashboard
//         </button>

//         <button
//           className="fr-btn fr-btn--tertiary fr-btn--sm"
//           onClick={fetchSessionInfo}
//           disabled={isLoading}
//         >
//           Rafraîchir session
//         </button>

//         <button
//           className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
//           onClick={testReconnexion}
//           disabled={isLoading}
//         >
//           Test reconnexion FC
//         </button>
//       </div>

//       {/* Affichage du résultat */}
//       {result && (
//         <div className="fr-mt-3w">
//           <p className="fr-text--sm fr-mb-1w">
//             <strong>Résultat :</strong>
//           </p>
//           <pre
//             className="fr-text--xs"
//             style={{
//               backgroundColor: result.success ? "#d1f7d1" : "#ffd1d1",
//               padding: "1rem",
//               borderRadius: "4px",
//               overflow: "auto",
//               maxHeight: "200px",
//             }}
//           >
//             {JSON.stringify(result, null, 2)}
//           </pre>
//         </div>
//       )}

//       {isLoading && (
//         <div className="fr-mt-2w">
//           <span className="fr-text--sm">Chargement...</span>
//         </div>
//       )}
//     </div>
//   );
// }
