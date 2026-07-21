import type { PluginContext } from '@harborclient/sdk';
import { EchoPanel } from './components/EchoPanel';
import { disposeEchoState, getEchoStatusStore, initEchoState } from './state';

/** Manifest footerPanels id for the Echo server slide-up panel. */
const ECHO_PANEL_ID = 'echo.panel';

/**
 * Pushes the native footer status-dot state for the current echo server status.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
function pushFooterIndicator(hc: PluginContext): void {
  const status = getEchoStatusStore().getSnapshot();
  hc.ui.setFooterPanelIndicator(ECHO_PANEL_ID, {
    status: status.running ? 'success' : 'muted',
    label: status.running ? 'Echo server active' : 'Echo server stopped'
  });
}

/**
 * Activates the renderer half and registers echo server UI contributions.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function activate(hc: PluginContext): void {
  initEchoState(hc);

  hc.subscriptions.push({ dispose: disposeEchoState });

  /**
   * Footer panel host that closes over the plugin context.
   */
  function EchoPanelHost() {
    return <EchoPanel hc={hc} />;
  }

  hc.subscriptions.push(
    hc.ui.registerFooterPanel({
      id: ECHO_PANEL_ID,
      title: 'Echo server',
      Component: EchoPanelHost
    })
  );

  pushFooterIndicator(hc);
  const unsubscribeIndicator = getEchoStatusStore().subscribe(() => {
    pushFooterIndicator(hc);
  });
  hc.subscriptions.push({ dispose: unsubscribeIndicator });
  hc.subscriptions.push({
    dispose: () => {
      hc.ui.setFooterPanelIndicator(ECHO_PANEL_ID, null);
    }
  });
}
