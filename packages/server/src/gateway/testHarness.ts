import "dotenv/config";
import { GatewayClient } from "./GatewayClient.js";

const url = process.env.GATEWAY_URL ?? "ws://127.0.0.1:18789";
const token = process.env.GATEWAY_TOKEN;
const password = process.env.GATEWAY_PASSWORD;

const client = new GatewayClient({
  url,
  token,
  password,
  clientName: "gateway-client",
  mode: "ui",
  onHello: async (hello) => {
    console.log("[hello]", JSON.stringify(hello, null, 2));
    try {
      const agents = await client.request("agents.list", {});
      console.log("[agents.list]", JSON.stringify(agents, null, 2));

      // Try a lightweight status method if available.
      const channels = await client.request("channels.status", {});
      console.log("[channels.status]", JSON.stringify(channels, null, 2));
    } catch (e) {
      console.error("[post-hello error]", e);
    }

    console.log("Connected + initial requests done. Ctrl+C to exit.");
  },
  onEvent: (ev) => {
    if (ev.event === "presence") return;
    console.log("[event]", ev.event);
  },
  onClose: (info) => {
    console.error("[close]", info);
  },
  onGap: (g) => {
    console.error("[gap]", g);
  },
});

client.start();

process.on("SIGINT", () => {
  client.stop();
  process.exit(0);
});
