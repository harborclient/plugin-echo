import { useEffect, useState } from '@harborclient/sdk/react';
import {
  getEchoStatus,
  startEchoStateSync,
  subscribeEchoState,
  syncEchoStateFromStorage,
  type EchoServerUiStatus
} from '../state';

/**
 * Status dot on the Echo server footer toggle: green when listening, grey when stopped.
 */
export function EchoFooterIndicator() {
  const [status, setStatus] = useState<EchoServerUiStatus>(getEchoStatus());

  /**
   * Syncs from plugin storage and main status, then keeps polling storage updates.
   */
  useEffect(() => {
    void syncEchoStateFromStorage();
    const unsubscribeLocal = subscribeEchoState(() => {
      setStatus(getEchoStatus());
    });
    const stopSync = startEchoStateSync();
    return () => {
      unsubscribeLocal();
      stopSync();
    };
  }, []);

  return (
    <span className="inline-flex items-center" role="status">
      <span className="sr-only">
        {status.running ? 'Echo server active' : 'Echo server stopped'}
      </span>
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          status.running ? 'bg-success' : 'bg-muted'
        }`}
        aria-hidden="true"
      />
    </span>
  );
}
