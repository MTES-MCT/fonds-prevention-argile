"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/contexts/AuthContext";

const HeaderAdmin = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (buttonRef.current) {
          buttonRef.current.setAttribute("aria-expanded", "false");
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fermer avec Echap
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        if (buttonRef.current) {
          buttonRef.current.setAttribute("aria-expanded", "false");
          buttonRef.current.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (buttonRef.current) {
      buttonRef.current.setAttribute("aria-expanded", newState.toString());
    }
  };

  // Si pas d'utilisateur, ne rien afficher
  if (!user) return null;

  return (
    <div
      id="header-user-dropdown"
      className="fr-translate fr-nav"
      ref={dropdownRef}
    >
      <div className="fr-nav__item">
        <button
          ref={buttonRef}
          aria-controls="user-dropdown-collapse"
          aria-expanded="false"
          title="Menu utilisateur"
          type="button"
          id="user-dropdown-button"
          className="fr-translate__btn fr-btn fr-btn--tertiary"
          onClick={toggleDropdown}
          disabled={isLoading}
        >
          <span className="fr-icon-account-circle-line" aria-hidden="true" />
          <span className="fr-hidden-sm">&nbsp;{user.firstName}</span>
        </button>

        <div
          className={`fr-collapse fr-translate__menu fr-menu ${isOpen ? "fr-collapse--expanded" : ""}`}
          id="user-dropdown-collapse"
        >
          <ul className="fr-menu__list">
            {/* Badge Admin */}
            <li className="fr-p-2w">
              <span className="fr-badge fr-badge--info fr-badge--no-icon">
                <span
                  className="fr-icon-shield-line fr-icon--sm fr-mr-1v"
                  aria-hidden="true"
                />
                {user.role === "admin" ? "Administrateur" : "Utilisateur"}
              </span>
            </li>

            {/* Liens du menu */}
            <li>
              <Link
                href="/dashboard"
                className="fr-translate__language fr-nav__link"
                id="user-menu-dashboard"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-draft-line fr-mr-1w"
                  aria-hidden="true"
                />
                Tableau de bord
              </Link>
            </li>

            <li>
              <Link
                href="/administration"
                className="fr-translate__language fr-nav__link"
                id="user-menu-admin"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-settings-5-line fr-mr-1w"
                  aria-hidden="true"
                />
                Administration
              </Link>
            </li>

            <li>
              <Link
                href="/statistiques"
                className="fr-translate__language fr-nav__link"
                id="user-menu-stats"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-bar-chart-line fr-mr-1w"
                  aria-hidden="true"
                />
                Statistiques
              </Link>
            </li>

            <li>
              <Link
                href="/test/ds-graphql"
                className="fr-translate__language fr-nav__link"
                id="user-menu-test"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-file-line fr-mr-1w"
                  aria-hidden="true"
                />
                Test - DS - GraphQL
              </Link>
            </li>

            <li>
              <Link
                href="/test/ds-prefill"
                className="fr-translate__language fr-nav__link"
                id="user-menu-test"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-file-line fr-mr-1w"
                  aria-hidden="true"
                />
                Test - DS - Prefill
              </Link>
            </li>

            <li>
              <button
                className="fr-translate__language fr-nav__link"
                id="user-menu-logout"
                onClick={handleLogout}
                disabled={isLoading}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "none",
                  cursor: isLoading ? "wait" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <span
                  className="fr-icon-logout-box-r-line fr-mr-1w"
                  aria-hidden="true"
                />
                {isLoading ? "Déconnexion..." : "Se déconnecter"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HeaderAdmin;
