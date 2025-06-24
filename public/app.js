document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("configForm");
  const configEl = document.getElementById("config");
  const statusEl = document.getElementById("status");
  const messagesContainer = document.getElementById("messagesContainer");
  const messagesEl = document.getElementById("messages");

  if (!form || !configEl || !statusEl || !messagesContainer || !messagesEl) {
    console.error("❌ Required DOM elements are missing.");
    return;
  }

  form.onsubmit = async function (event) {
    event.preventDefault();

    const wsUrl = document.getElementById("wsUrl").value.trim();
    const allowedOrigins = document
      .getElementById("allowedOrigins")
      .value.trim();
    const userId = document.getElementById("userId").value.trim();
    const secretKey = document.getElementById("secretKey").value;

    // Clear previous messages
    messagesEl.innerHTML = "";

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wsUrl,
          allowedOrigins,
          userId,
          secretKey,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const config = await res.json();

      if (!config) {
        statusEl.textContent = "❌ Config not loaded.";
        return;
      }

      configEl.innerHTML = `
          <strong>WebSocket URL:</strong> ${config.url}<br />
          <strong>User:</strong> ${config.user}<br />
          <strong>Allowed Origins:</strong> ${config.allowedOrigins}
        `;

      const centrifuge = new window.Centrifuge(config.url, {
        token: config.token,
        autoConnect: false,
      });

      centrifuge.on("state", (ctx) => {
        console.log(`🔄 State changed: ${ctx.newState}`);
        switch (ctx.newState) {
          case "connected":
            statusEl.innerHTML = `<span class="status-dot">🟢</span> Connected`;
            break;
          case "connecting":
            statusEl.innerHTML = `<span class="status-dot">🔄</span> Connecting...`;
            break;
          case "disconnected":
            statusEl.innerHTML = `<span class="status-dot red">🔴</span> Disconnected`;
            break;
        }
      });

      centrifuge.on("connect", (ctx) => {
        console.log("✅ CONNECTED:", ctx);
      });

      centrifuge.on("disconnect", (ctx) => {
        console.warn("⚠️ Disconnected:", ctx.reason);
      });

      centrifuge.on("connect_error", (ctx) => {
        console.error("❌ Connection error:", ctx);
        statusEl.innerText = "❌ Failed to connect";
      });

      centrifuge.on("error", (err) => {
        console.error("❌ Centrifugo error:", err);
      });

      const sub = centrifuge.newSubscription("test", {
        presence: true,
      });

      sub.on("subscribed", () => {
        console.log("✅ Subscribed to test");
      });

      sub.on("presence", (ctx) => {
        console.log("✅ Presence event:", ctx);
      });

      sub.on("publication", (ctx) => {
        console.log("📩 Message received:", ctx.data);

        // ✅ Check real computed visibility
        if (getComputedStyle(messagesContainer).display === "none") {
          messagesContainer.style.display = "block";
        }

        const msgEl = document.createElement("li");
        msgEl.textContent = JSON.stringify(ctx.data);
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });

      sub.on("error", (err) => {
        console.error("❌ Subscription error:", err);
      });

      sub.on("unsubscribed", (ctx) => {
        console.warn("🚫 Unsubscribed from channel by server:", ctx);

        // Optional: reflect in UI
        const msgEl = document.createElement("li");
        msgEl.textContent =
          "⚠️ You were unsubscribed from the channel by the server.";
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Optional: update statusEl or configEl
        statusEl.innerHTML = `<span class="status-dot red">🔴</span> Unsubscribed`;
      });

      console.log("🔑 Token:", config.token);
      sub.subscribe();
      centrifuge.connect();
    } catch (err) {
      statusEl.textContent = "❌ Error loading config";
      console.error(err);
    }
  };
});
