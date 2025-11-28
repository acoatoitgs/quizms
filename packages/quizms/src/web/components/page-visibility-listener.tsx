import { useCallback, useEffect, useRef } from "react";

import { Modal } from "@olinfo/react-components";

const WARNING_DELAY_MS = 1000;

export function PageVisibilityListener() {
  const lastHidden = useRef<boolean | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pendingTimerID = useRef<number | null>(null);
  const openDialog = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.showModal === "function") {
      if (!d.open) {
        try {
          d.showModal();
        } catch {}
      }
    } else {
      d.setAttribute("open", "");
    }
  }, []);

  const closeDialog = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.close === "function") {
      try {
        d.close();
      } catch {
        d.removeAttribute("open");
      }
    } else {
      d.removeAttribute("open");
    }
  }, []);

  const scheduleWarning = useCallback(() => {
    //  Clear any existing timer to avoid multiple warnings
    if (pendingTimerID.current) {
      clearTimeout(pendingTimerID.current);
    }
    // Schedule the dialog to open after the delay
    const timerId = window.setTimeout(() => {
      openDialog();
      pendingTimerID.current = null; // Clear ID after execution
    }, WARNING_DELAY_MS);

    pendingTimerID.current = timerId;
  }, [openDialog]);

  const cancelWarning = useCallback(() => {
    // Clear the timer and reset the ref
    if (pendingTimerID.current) {
      clearTimeout(pendingTimerID.current);
      pendingTimerID.current = null;
    }
  }, []);

  useEffect(() => {
    const onHidden = () => scheduleWarning();
    const onVisible = () => cancelWarning();

    const handleVisibility = () => {
      const hidden = document.hidden;
      if (lastHidden.current === hidden) return;
      lastHidden.current = hidden;
      hidden ? onHidden() : onVisible();
    };

    const handleBlur = () => {
      const active = document.activeElement;
      if (active instanceof HTMLIFrameElement && active.classList.contains("iframe_blockly")) {
        onVisible();
        return;
      }
      onHidden();
    };

    const handleFocus = () => {
      onVisible();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      cancelWarning();
      closeDialog();
    };
  }, [closeDialog, scheduleWarning, cancelWarning]);

  return (
    <Modal ref={dialogRef} title="Attenzione">
      <div className="flex justify-center pt-3">
        <span className="pt-1 font-mono text-3xl">
          Non puoi uscire dalla pagina durante la gara!
        </span>
      </div>
    </Modal>
  );
}
