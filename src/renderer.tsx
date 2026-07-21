import type { PluginContext } from '@harborclient/sdk';
import { EchoPanel } from './components/EchoPanel';
import { disposeEchoState, getEchoStatusStore, initEchoState } from './state';

/** Manifest footerPanels id for the Echo server slide-up panel. */
const ECHO_PANEL_ID = 'echo.panel';

/** Unsubscribe for the footer status-dot store subscription. */
let unsubscribeIndicator: (() => void) | undefined;

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

  /**
   * Footer panel host that closes over the plugin context.
   */
  function EchoPanelHost() {
    return <EchoPanel hc={hc} />;
  }

  hc.ui.registerFooterPanel({
    id: ECHO_PANEL_ID,
    title: 'Echo server',
    Component: EchoPanelHost
  });

  pushFooterIndicator(hc);
  unsubscribeIndicator = getEchoStatusStore().subscribe(() => {
    pushFooterIndicator(hc);
  });
}

/**
 * Tears down renderer-side echo server state and footer indicator on deactivation.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function deactivate(hc: PluginContext): void {
  unsubscribeIndicator?.();
  unsubscribeIndicator = undefined;
  hc.ui.setFooterPanelIndicator(ECHO_PANEL_ID, null);
  disposeEchoState();
}
