const config = JSON.parse(
  globalThis.document.currentScript?.dataset.config ?? "",
);
const send = (category, value) => {
  const message = value instanceof Error ? value.message : String(value);
  globalThis.parent.postMessage(
    {
      type: "sefaria-playground-diagnostic",
      channel: config.channel,
      run: config.run,
      diagnostic: { category, message: message.slice(0, 1000) },
    },
    "*",
  );
};

globalThis.addEventListener("error", (event) =>
  send("runtime", event.error ?? event.message),
);
globalThis.addEventListener("unhandledrejection", (event) =>
  send("runtime", event.reason),
);
globalThis.addEventListener("securitypolicyviolation", (event) =>
  send("csp", `${event.violatedDirective}: ${event.blockedURI || "inline"}`),
);

globalThis.document.querySelector("#root").innerHTML = config.html;
import(config.javascriptUrl)
  .then(() =>
    globalThis.parent.postMessage(
      {
        type: "sefaria-playground-ready",
        channel: config.channel,
        run: config.run,
      },
      "*",
    ),
  )
  .catch((error) => send("import", error));
