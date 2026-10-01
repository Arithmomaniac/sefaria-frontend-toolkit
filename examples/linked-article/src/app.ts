import {
  createSefariaClient,
  type SefariaClient,
} from "@arithmomaniac/sefaria-client";
import "@arithmomaniac/sefaria-web-components";
import type {
  SefariaDataSource,
  SefariaSourceCard,
} from "@arithmomaniac/sefaria-web-components";

const DIALOG_ID = "linked-article-source-preview";
const LINK_SELECTOR = "a[data-sefaria-ref]";
const STATUS_SELECTOR = "[data-linked-article-status]";

export interface LinkedArticleApp {
  destroy(): void;
}

export function startLinkedArticle(
  root: Document = document,
  client: SefariaClient = createSefariaClient({ cache: false }),
): LinkedArticleApp {
  const source: SefariaDataSource = { kind: "client", client };
  const existingStatus = root.querySelector<HTMLElement>(STATUS_SELECTOR);
  const status = existingStatus ?? root.createElement("p");
  if (existingStatus === null) {
    status.dataset.linkedArticleStatus = "";
    status.className = "linked-article-status";
    root.body.append(status);
  }

  const anchors = [...root.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)];
  const listeners = new Map<HTMLAnchorElement, (event: MouseEvent) => void>();
  const originalControls = new Map<HTMLAnchorElement, string | null>();
  let active:
    | {
        card: SefariaSourceCard;
        anchor: HTMLAnchorElement;
        close(): void;
      }
    | undefined;
  let destroyed = false;

  for (const anchor of anchors) {
    if (!isEligibleAnchor(anchor)) {
      continue;
    }
    originalControls.set(anchor, anchor.getAttribute("aria-controls"));
    anchor.setAttribute("aria-controls", DIALOG_ID);
    const listener = (event: MouseEvent): void => {
      if (
        !isEligibleAnchor(anchor) ||
        !shouldEnhanceActivation(event, anchor)
      ) {
        return;
      }
      event.preventDefault();
      const tref = anchor.dataset.sefariaRef;
      if (tref === undefined) {
        return;
      }
      open(anchor, tref.trim());
    };
    listeners.set(anchor, listener);
    anchor.addEventListener("click", listener);
  }

  function open(anchor: HTMLAnchorElement, tref: string): void {
    status.textContent = "";
    status.setAttribute("role", "status");
    if (active !== undefined) {
      active.anchor = anchor;
      active.card.setAttribute("sref", tref);
      return;
    }

    // #region open-preview
    // Each opening owns its nodes so queued close/error events cannot close a newer preview.
    const dialog = root.createElement("dialog");
    dialog.id = DIALOG_ID;
    dialog.className = "source-preview";
    dialog.setAttribute("aria-label", "Sefaria source preview");
    const closeButton = root.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close source preview";
    closeButton.autofocus = true;
    const card = root.createElement("sefaria-source-card") as SefariaSourceCard;
    card.source = source;
    card.setAttribute("sref", tref);
    const events = new AbortController();
    const preview = {
      card,
      anchor,
      close(): void {
        if (active !== preview) return;
        active = undefined;
        events.abort();
        card.setAttribute("sref", "");
        dialog.close();
        dialog.remove();
        if (preview.anchor.isConnected) preview.anchor.focus();
      },
    };
    active = preview;
    closeButton.addEventListener("click", preview.close, {
      signal: events.signal,
    });
    dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
        preview.close();
      },
      { signal: events.signal },
    );
    dialog.addEventListener("close", preview.close, { signal: events.signal });
    card.addEventListener(
      "sefaria-source-card-error",
      (event: Event) => {
        const { error, sref } = (
          event as CustomEvent<{
            readonly error: unknown;
            readonly sref: string;
          }>
        ).detail;
        if (active !== preview || card.sref !== sref) return;
        preview.close();
        status.textContent =
          error instanceof Error ? error.message : String(error);
        status.setAttribute("role", "alert");
      },
      { signal: events.signal },
    );
    dialog.append(closeButton, card);
    root.body.append(dialog);
    dialog.showModal();
    closeButton.focus();
    // #endregion open-preview
  }

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      active?.close();
      for (const [anchor, listener] of listeners) {
        anchor.removeEventListener("click", listener);
        if (anchor.getAttribute("aria-controls") === DIALOG_ID) {
          const original = originalControls.get(anchor);
          if (original === null || original === undefined)
            anchor.removeAttribute("aria-controls");
          else anchor.setAttribute("aria-controls", original);
        }
      }
      if (existingStatus === null) {
        status.remove();
      } else {
        status.textContent = "";
        status.setAttribute("role", "status");
      }
    },
  };
}

// #region eligible-link
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
// #endregion eligible-link
