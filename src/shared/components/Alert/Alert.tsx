"use client";

import { useState } from "react";

type AlertType = "info" | "success" | "warning" | "error";

interface AlertProps {
  type?: AlertType;
  title: string;
  description?: string;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function Alert({
  type = "info",
  title,
  description,
  closable = true,
  onClose,
  className = "",
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className={`fr-alert fr-alert--${type} ${className}`}>
      <h3 className="fr-alert__title">{title}</h3>
      {description && <p>{description}</p>}
      {closable && (
        <button
          title="Masquer le message"
          onClick={handleClose}
          type="button"
          className="fr-btn--close fr-btn"
        >
          Masquer le message
        </button>
      )}
    </div>
  );
}
