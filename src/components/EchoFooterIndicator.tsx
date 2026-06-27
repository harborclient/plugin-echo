import { useEffect, useState } from "@harborclient/sdk/react";
import {
  getEchoStatus,
  subscribeEchoState,
  type EchoServerUiStatus,
} from "../state";

/**
 * Green dot shown on the Echo server footer toggle when the server is listening.
 */
export function EchoFooterIndicator() {
  const [status, setStatus] = useState<EchoServerUiStatus>(getEchoStatus());

  /**
   * Subscribes to shared echo server state for live indicator updates.
   */
  useEffect(() => {
    return subscribeEchoState(() => {
      setStatus(getEchoStatus());
    });
  }, []);

  if (!status.running) {
    return null;
  }

  return (
    <span className="inline-flex items-center" role="status">
      <span className="sr-only">Echo server active</span>
      <span
        className="inline-block h-2 w-2 rounded-full bg-success"
        aria-hidden="true"
      />
    </span>
  );
}
