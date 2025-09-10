"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderDropdownProps {
  userName?: string;
  userEmail?: string;
  userInitials?: string;
}

const HeaderDropdown = ({
  userName = "Utilisateur",
  userEmail,
  userInitials,
}: HeaderDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Configuration des items du menu
  const handleLogout = () => {
    // TODO logique de déconnexion ici
    console.log("Déconnexion...");
    // Par exemple : signOut() de next-auth
    router.push("/deconnexion");
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
        >
          <span className="fr-icon-account-circle-line" aria-hidden="true" />
          <span className="fr-hidden-sm">&nbsp;{userName}</span>
        </button>

        <div
          className={`fr-collapse fr-translate__menu fr-menu ${isOpen ? "fr-collapse--expanded" : ""}`}
          id="user-dropdown-collapse"
        >
          <ul className="fr-menu__list">
            {/* En-tête avec infos utilisateur */}
            {userEmail && (
              <>
                <li
                  className="fr-p-2w"
                  style={{
                    borderBottom: "1px solid var(--border-default-grey)",
                  }}
                >
                  <div className="fr-text--sm">
                    <p className="fr-text--bold fr-mb-0">{userName}</p>
                    <p
                      className="fr-mb-0 fr-text--regular"
                      style={{ color: "var(--text-mention-grey)" }}
                    >
                      {userEmail}
                    </p>
                  </div>
                </li>
              </>
            )}

            {/* Liens du menu */}
            <li>
              <Link
                href="/administration"
                className="fr-translate__language fr-nav__link"
                id="user-administration"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-account-circle-fill fr-mr-1w"
                  aria-hidden="true"
                />
                Administration
              </Link>
            </li>

            <li>
              <Link
                href="/test/ds-graphql"
                className="fr-translate__language fr-nav__link"
                id="user-menu-documents"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-file-text-line fr-mr-1w"
                  aria-hidden="true"
                />
                Test DS (GraphQL)
              </Link>
            </li>

            <li>
              <Link
                href="/test/ds-prefill"
                className="fr-translate__language fr-nav__link"
                id="user-menu-documents"
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="fr-icon-file-text-line fr-mr-1w"
                  aria-hidden="true"
                />
                Test DS (REST)
              </Link>
            </li>

            <li>
              <button
                className="fr-translate__language fr-nav__link"
                id="user-menu-logout"
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <span
                  className="fr-icon-logout-box-r-line fr-mr-1w"
                  aria-hidden="true"
                />
                Se déconnecter
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HeaderDropdown;
