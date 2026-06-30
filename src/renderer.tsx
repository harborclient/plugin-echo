import { installReact } from '@harborclient/sdk';
import type { PluginContext } from '@harborclient/sdk';
import { EchoFooterIndicator } from './components/EchoFooterIndicator';
import { EchoPanel } from './components/EchoPanel';
import { initEchoState } from './state';

/**
 * Activates the renderer half and registers echo server UI contributions.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function activate(hc: PluginContext): void {
  installReact(hc.react);
  initEchoState(hc);

  /**
   * Footer panel host that closes over the plugin context.
   */
  function EchoPanelHost() {
    return <EchoPanel hc={hc} />;
  }

  hc.subscriptions.push(
    hc.ui.registerFooterPanel({
      id: 'echo.panel',
      title: 'Echo server',
      Component: EchoPanelHost,
      Indicator: EchoFooterIndicator
    })
  );
}
