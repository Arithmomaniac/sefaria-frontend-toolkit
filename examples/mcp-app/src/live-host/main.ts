import { createLiveHost } from "./live-host.js";

declare global {
  interface Window {
    __sefariaMcpLiveHost?: ReturnType<typeof createLiveHost>["state"];
  }
}

const host = createLiveHost({
  startButton: requiredElement("start-live-demo"),
  status: requiredElement("status"),
  frame: requiredElement("sandbox"),
  loadAppHtml: async () => {
    const response = await fetch("./mcp-app.html");
    if (!response.ok) {
      throw new Error(`Unable to load the packaged App (${response.status}).`);
    }
    return response.text();
  },
});

window.__sefariaMcpLiveHost = host.state;
window.addEventListener("pagehide", () => {
  void host.close();
});

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}.`);
  return element;
}
