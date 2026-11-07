import { useAtomValue } from "@effect/atom-react";
import { useNavigation } from "@react-navigation/native";
import {
  AuthPreviewOperateScope,
  type DiscoveredLocalServer,
  type EnvironmentId,
  type ThreadId,
} from "@t3tools/contracts";
import * as Option from "effect/Option";
import { Keyboard } from "react-native";

import type { AppBarMenu } from "../../components/ui/AppBar.types";
import * as Dialog from "../../components/ui/Dialog";
import { tryOpenExternalUrl } from "../../lib/openExternalUrl";
import { useEnvironmentServerConfig } from "../../state/entities";
import { previewEnvironment, useThreadDiscoveredServers } from "../../state/preview";
import { useEnvironmentScope, usePreparedConnection } from "../../state/session";
import { useAtomCommand } from "../../state/use-atom-command";
import { discoveredServerExternalUrl } from "../browser/discoveredServerUrl";

/** The thread's running local servers, mirroring the desktop thread details panel. */
export function useThreadServersMenu(input: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  readonly enabled: boolean;
}): AppBarMenu | null {
  const navigation = useNavigation();
  const capabilities = useEnvironmentServerConfig(input.environmentId)?.environment.capabilities;
  const servers = useThreadDiscoveredServers(input);
  const prepared = usePreparedConnection(input.environmentId);
  const canOpen = useEnvironmentScope(input.environmentId, AuthPreviewOperateScope);
  const canStop = useAtomValue(
    previewEnvironment.stopLocalServer.permissionAtom(input.environmentId),
  );
  const openPreview = useAtomCommand(previewEnvironment.open, "open local server");
  const stopServer = useAtomCommand(previewEnvironment.stopLocalServer, "stop local server");
  if (servers.length === 0) return null;

  const httpBaseUrl = Option.isSome(prepared) ? prepared.value.httpBaseUrl : null;
  const canOpenInApp = canOpen && capabilities?.serverBrowser === true;
  const canStopServers = canStop && capabilities?.localServerStop === true;

  const openInApp = async (server: DiscoveredLocalServer) => {
    Keyboard.dismiss();
    // The environment's own browser loads the page, so loopback URLs need no rewriting.
    const result = await openPreview({
      environmentId: input.environmentId,
      input: { threadId: input.threadId, url: server.url, runtime: "server" },
    });
    if (result._tag === "Failure") return;
    navigation.navigate("ThreadBrowserPreview", {
      environmentId: input.environmentId,
      threadId: input.threadId,
      tabId: result.value.tabId,
    });
  };

  const openInBrowser = async (url: string) => {
    if (!(await tryOpenExternalUrl(url, "local-server"))) {
      Dialog.alert("Could not open the browser", url);
    }
  };

  return {
    title: "Servers",
    icon: "globe",
    separateBackground: false,
    items: servers.map((server) => {
      const externalUrl =
        httpBaseUrl === null ? null : discoveredServerExternalUrl(server.url, httpBaseUrl);
      const origin = [server.terminal === null ? "Agent" : "Terminal", server.processName]
        .filter(Boolean)
        .join(" · ");
      return {
        id: `server-${server.pid ?? "unknown"}-${server.port}`,
        title: `localhost:${server.port} · ${origin}`,
        icon: "globe",
        items: [
          {
            id: "open-in-app",
            title: "Open in app",
            icon: "iphone",
            subtitle: "Watch and control it from this device",
            disabled: !canOpenInApp,
            onPress: () => void openInApp(server),
          },
          {
            id: "open-in-browser",
            title: "Open in browser",
            icon: "safari",
            subtitle: externalUrl ?? "Needs a LAN or Tailscale connection",
            disabled: externalUrl === null,
            onPress: () => {
              if (externalUrl !== null) void openInBrowser(externalUrl);
            },
          },
          ...(canStopServers && server.pid !== null
            ? [
                {
                  id: "stop",
                  title: "Stop server",
                  icon: "stop.fill",
                  destructive: true,
                  onPress: () => {
                    if (server.pid === null) return;
                    void stopServer({
                      environmentId: input.environmentId,
                      input: { pid: server.pid, port: server.port },
                    });
                  },
                },
              ]
            : []),
        ],
      };
    }),
  };
}
