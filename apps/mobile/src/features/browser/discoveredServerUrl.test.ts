import { describe, expect, it } from "vite-plus/test";

import { discoveredServerExternalUrl } from "./discoveredServerUrl";

describe("discoveredServerExternalUrl", () => {
  it.each([
    ["tailnet MagicDNS", "https://mac.tail1234.ts.net:3773", "http://mac.tail1234.ts.net:5173/"],
    ["tailnet IPv4", "http://100.101.102.103:3773", "http://100.101.102.103:5173/"],
    ["LAN", "http://192.168.1.20:3773", "http://192.168.1.20:5173/"],
    ["tailnet IPv6", "http://[fd7a:115c:a1e0::1]:3773", "http://[fd7a:115c:a1e0::1]:5173/"],
    ["same machine", "http://127.0.0.1:3773", "http://localhost:5173/"],
  ])("moves a loopback server onto the %s host", (_name, environmentUrl, expected) => {
    expect(discoveredServerExternalUrl("http://localhost:5173/", environmentUrl)).toBe(expected);
  });

  it("keeps the path and query", () => {
    expect(
      discoveredServerExternalUrl("http://127.0.0.1:3000/docs?x=1", "http://100.64.0.2:3773"),
    ).toBe("http://100.64.0.2:3000/docs?x=1");
  });

  it("returns null when the environment is only reachable through a public tunnel", () => {
    expect(
      discoveredServerExternalUrl("http://localhost:5173/", "https://abc.connect.t3.codes"),
    ).toBeNull();
  });

  it("leaves non-loopback servers alone", () => {
    expect(
      discoveredServerExternalUrl("http://192.168.1.20:8080/", "https://abc.connect.t3.codes"),
    ).toBe("http://192.168.1.20:8080/");
  });
});
