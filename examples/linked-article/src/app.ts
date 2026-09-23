import {
  createSefariaClient,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaAcquisition,
  SefariaPopup,
} from "@arithmomaniac/sefaria-web-components";

const POPUP_ID = "linked-article-source-popup";
const LINK_SELECTOR = "a[data-sefaria-ref]";
const STATUS_SELECTOR = "[data-linked-article-status]";

export interface LinkedArticleApp {
  destroy(): void;
}

export function startLinkedArticle(
  root: Document = document,
  client: SefariaClient = createSefariaClient({ cache: false }),
): LinkedArticleApp {
  const popup = root.createElement("sefaria-popup") as SefariaPopup;
  const acquisition: SefariaAcquisition = { kind: "client", client };
  popup.acquisition = acquisition;
  popup.id = POPUP_ID;
  root.body.append(popup);
  const existingStatus = root.querySelector<HTMLElement>(STATUS_SELECTOR);
  const status = existingStatus ?? root.createElement("p");
  if (existingStatus === null) {
    status.dataset.linkedArticleStatus = "";
    status.className = "linked-article-status";
    root.body.append(status);
  }

  const anchors = [...root.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)];
  const listeners = new Map<HTMLAnchorElement, (event: MouseEvent) => void>();
  const close = (): void => {
    popup.setAttribute("sref", "");
    popup.removeAttribute("open");
  };
  const showError = (event: Event): void => {
    const detail = (
      event as CustomEvent<{ readonly error: unknown; readonly sref: string }>
    ).detail;
    if (popup.sref !== detail.sref) {
      return;
    }
    close();
    status.textContent =
      detail.error instanceof Error
        ? detail.error.message
        : String(detail.error);
    status.setAttribute("role", "alert");
  };

  popup.addEventListener("sefaria-popup-close", close);
  popup.addEventListener("sefaria-popup-error", showError);

  for (const anchor of anchors) {
    if (!isEligibleAnchor(anchor)) {
      continue;
    }
    anchor.setAttribute("aria-controls", POPUP_ID);
    const listener = (event: MouseEvent): void => {
      if (!shouldEnhanceActivation(event, anchor)) {
        return;
      }
      event.preventDefault();
      const tref = anchor.dataset.sefariaRef;
      if (tref === undefined) {
        return;
      }
      open(anchor, tref);
    };
    listeners.set(anchor, listener);
    anchor.addEventListener("click", listener);
  }

  function open(anchor: HTMLAnchorElement, tref: string): void {
    popup.anchor = anchor;
    status.textContent = "";
    status.setAttribute("role", "status");
    popup.setAttribute("sref", tref);
    popup.setAttribute("open", "");
  }

  return {
    destroy(): void {
      close();
      popup.removeEventListener("sefaria-popup-close", close);
      popup.removeEventListener("sefaria-popup-error", showError);
      for (const [anchor, listener] of listeners) {
        anchor.removeEventListener("click", listener);
        anchor.removeAttribute("aria-controls");
      }
      popup.remove();
      if (existingStatus === null) {
        status.remove();
      } else {
        status.textContent = "";
        status.setAttribute("role", "status");
      }
    },
  };
}

function isEligibleAnchor(anchor: HTMLAnchorElement): boolean {
  const tref = anchor.dataset.sefariaRef;
  if (tref === undefined || tref.trim().length === 0) {
    return false;
  }
  try {
    const url = new URL(anchor.href);
    return (
      url.protocol === "https:" &&
      url.hostname === "www.sefaria.org" &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

function shouldEnhanceActivation(
  event: MouseEvent,
  anchor: HTMLAnchorElement,
): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !anchor.hasAttribute("download") &&
    (anchor.target === "" || anchor.target === "_self")
  );
}
