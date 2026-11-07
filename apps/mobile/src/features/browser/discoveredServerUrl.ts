import { isLocalLoopbackHost, isPrivateNetworkHost } from "@t3tools/shared/hostClassification";
import { isLoopbackHost } from "@t3tools/shared/preview";

/**
 * The URL this device's browser uses to reach a server discovered on the environment.
 * Loopback servers move to the environment's host, which only works on a private network
 * such as a LAN or tailnet. Returns null when the environment is reached through a tunnel.
 */
export function discoveredServerExternalUrl(
  serverUrl: string,
  environmentHttpBaseUrl: string,
): string | null {
  try {
    const url = new URL(serverUrl);
    if (!isLoopbackHost(url.hostname)) return url.href;
    const environmentHost = new URL(environmentHttpBaseUrl).hostname.replace(/^\[|\]$/g, "");
    if (!isPrivateNetworkHost(environmentHost)) return null;
    if (isLocalLoopbackHost(environmentHost)) return url.href;
    url.hostname = environmentHost.includes(":") ? `[${environmentHost}]` : environmentHost;
    return url.href;
  } catch {
    return null;
  }
}
