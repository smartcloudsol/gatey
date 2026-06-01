import {
  useEffect,
  useState,
  type PropsWithChildren,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { clearShadowMount, ensureShadowMount } from "./shadowMount";

type ShadowPreviewPortalProps = PropsWithChildren<{
  hostRef: RefObject<HTMLElement | null>;
  rootClassName: string;
  stylesheets?: Array<string | null | undefined>;
  minHeight?: string;
}>;

export function ShadowPreviewPortal({
  hostRef,
  rootClassName,
  stylesheets = [],
  minHeight,
  children,
}: ShadowPreviewPortalProps) {
  const [mountTarget, setMountTarget] = useState<HTMLDivElement | null>(null);
  const normalizedStylesheets = stylesheets.filter(
    (href): href is string => typeof href === "string" && href.length > 0,
  );
  const stylesheetsKey = normalizedStylesheets.join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      setMountTarget(null);
      return;
    }

    let isActive = true;

    ensureShadowMount(host, {
      rootClassName,
      stylesheets: normalizedStylesheets,
      minHeight,
    })
      .then((rootElement) => {
        if (isActive) {
          setMountTarget(rootElement);
        }
      })
      .catch((error) => {
        console.error(error);
        if (isActive) {
          setMountTarget(null);
        }
      });

    return () => {
      isActive = false;
      clearShadowMount(host);
      setMountTarget(null);
    };
  }, [
    hostRef,
    minHeight,
    normalizedStylesheets,
    rootClassName,
    stylesheetsKey,
  ]);

  return mountTarget ? createPortal(children, mountTarget) : null;
}
