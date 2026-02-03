import Emittery from "emittery";
import { useEffect } from "react";

const emitter = new Emittery();

export const pub = (name: PropertyKey, data?: unknown) =>
  emitter.emit(name, data);

export const usePub = () => pub;

export const useSub = <T = unknown>(
  name: PropertyKey,
  callback: (data: T) => void | Promise<void>
) => {
  const unsub = () => emitter.off(name, callback);

  // Be sure we unsub if unmounted.
  useEffect(() => {
    emitter.on(name, callback);
    return () => unsub();
  });

  return unsub;
};
