import Emittery from "emittery";
import { useEffect, useRef } from "react";

const emitter = new Emittery();

export const usePub = () => (name: PropertyKey, data: any) =>
  emitter.emit(name, data);

export const useSub = (
  name: PropertyKey,
  callback: (data: any) => void | Promise<void>
) => {
  const callbackRef = useRef(callback);
  const handlerRef = useRef<((data: any) => void | Promise<void>) | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const unsub = () => {
    if (handlerRef.current) {
      emitter.off(name, handlerRef.current);
    }
  };

  // Be sure we unsub if unmounted.
  useEffect(() => {
    const handler = (data: any) => callbackRef.current(data);
    handlerRef.current = handler;
    emitter.on(name, handler);
    return () => {
      emitter.off(name, handler);
      if (handlerRef.current === handler) {
        handlerRef.current = undefined;
      }
    };
  }, [name]);

  return unsub;
};
