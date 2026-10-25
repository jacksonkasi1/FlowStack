// ** import core packages
import { useEffect } from "react";

const pending = new WeakMap<object, Promise<any>>();
export const SESSION_EVENT = "flowstack:session-changed";
const CHANNEL = "flowstack-session";

export function refreshSession(client: any): Promise<any> {
  const current = pending.get(client);
  if (current) return current;
  const request = Promise.resolve(
    client.getSession({
      query: { disableCookieCache: true },
      fetchOptions: { cache: "no-store" },
    }),
  )
    .then((result) => {
      if (result.error)
        throw new Error(result.error.message || "Unable to refresh session.");
      return result.data;
    })
    .finally(() => pending.delete(client));
  pending.set(client, request);
  return request;
}

export async function notifySessionChange(client: any) {
  await refreshSession(client);
  window.dispatchEvent(new Event(SESSION_EVENT));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage("changed");
    channel.close();
  }
}

export function SessionSync({ client }: { client: any }) {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => {
      void refreshSession(client)
        .then(() => window.dispatchEvent(new Event(SESSION_EVENT)))
        .catch(() => undefined);
    };
    return () => channel.close();
  }, [client]);
  return null;
}
