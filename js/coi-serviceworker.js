/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coisw = {
    shouldRegister: () => navigator.serviceWorker && navigator.serviceWorker.controller === null,
    register: () => {
        const n = navigator.serviceWorker;
        if (n.controller) return; // Already controlled
        n.register(window.document.currentScript.src).then(
            (r) => {
                console.log("COI Service Worker registered", r);
                r.addEventListener("updatefound", () => window.location.reload());
                if (r.installing) {
                    r.installing.addEventListener("statechange", () => {
                        if (r.installing.state === "activated") window.location.reload();
                    });
                }
            },
            (e) => console.error("COI Service Worker failed", e)
        );
    },
};

if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", function (event) {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") return;

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) return response;

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    coisw.register();
}
