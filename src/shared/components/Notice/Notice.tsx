"use client";

import { useState } from "react";

export interface NoticeProps {
  buttonClose?: boolean;
  className: string;
  description: string;
  title?: string;
  noticeKey?: string;
  more?: string;
  more_link?: string;
}

export default function Notice({
  buttonClose = false,
  className,
  description,
  title,
  noticeKey,
  more,
  more_link,
}: NoticeProps) {
  const [isCloseButtonVisible, setIsCloseButtonVisible] =
    useState<boolean>(true);

  if (!isCloseButtonVisible) return null;

  const isWarning = className.includes("fr-notice--warning");

  return (
    <div className={`fr-notice ${className}`} key={noticeKey}>
      <div className="fr-container">
        <div className="fr-notice__body">
          <span>
            <span
              className={`fr-notice__title ${
                isWarning ? "fr-icon-edit-box-fill" : ""
              }`}
              data-testid="warning-icon"
            >
              {title}
            </span>
            <span className="ml-0 md:ml-2 text-sm md:text-base">
              {description}
            </span>
            {more && (
              <a
                href={more_link ? more_link : "#"}
                className="ml-2 underline text-sm md:text-base"
              >
                {more}
              </a>
            )}
          </span>
          {buttonClose && (
            <button
              className="fr-btn--close fr-btn"
              onClick={() => setIsCloseButtonVisible(false)}
              title="Masquer le message"
              type="button"
            >
              Masquer le message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
