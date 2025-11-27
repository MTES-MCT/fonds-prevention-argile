"use client";

import { createPortal } from "react-dom";
import type { AgentWithPermissions } from "@/features/backoffice/administration/services/agents-admin.service";

interface AgentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: AgentWithPermissions | null;
  isLoading?: boolean;
}

export default function AgentDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  agent,
  isLoading = false,
}: AgentDeleteModalProps) {
  if (!isOpen || !agent) return null;

  const fullName = [agent.agent.givenName, agent.agent.usualName].filter(Boolean).join(" ");

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-red-600">Supprimer l'agent</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" disabled={isLoading}>
            <span className="fr-icon-close-line" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="mb-4">
            Êtes-vous sûr de vouloir supprimer l'agent <strong>{fullName}</strong> ({agent.agent.email}) ?
          </p>
          <div className="fr-alert fr-alert--warning fr-alert--sm">
            <p>Cette action est irréversible. L'agent ne pourra plus accéder au backoffice.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button type="button" className="fr-btn fr-btn--secondary" onClick={onClose} disabled={isLoading}>
            Annuler
          </button>
          <button
            type="button"
            className="fr-btn fr-btn--primary"
            style={{ backgroundColor: "#e3132f" }}
            onClick={handleConfirm}
            disabled={isLoading}>
            {isLoading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}
