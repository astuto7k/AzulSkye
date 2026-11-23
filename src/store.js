import { useCallback, useEffect, useRef, useState } from "react";
export async function api(action, body) {
  const res = await fetch("/api/store?action=" + encodeURIComponent(action), {
    cache: "no-store",
    credentials: "same-origin",
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const value = await res.json().catch(() => null);
  if (!res.ok || !value)
    throw Error(value?.error || "Sem conexão com a loja. Tente novamente.");
  return value;
}
export function useStore() {
  const [catalog, setCatalog] = useState(null),
    [account, setAccount] = useState(null),
    [error, setError] = useState("");
  const counter = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++counter.current;
    try {
      const [goods, me] = await Promise.all([api("catalog"), api("me")]);
      if (counter.current === id) {
        setCatalog(goods);
        setAccount(me);
        setError("");
      }
      return me;
    } catch (err) {
      if (counter.current === id) {
        setError(err.message);
        setAccount(null);
      }
      throw err;
    }
  }, []);
  useEffect(() => {
    const reload = () => {
      if (!document.hidden) refresh().catch(() => {});
    };
    reload();
    const timer = setInterval(reload, 60000);
    window.addEventListener("focus", reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", reload);
      counter.current++;
    };
  }, [refresh]);
  return { catalog, account, error, refresh };
}
export function destination(user) {
  return (
    { admin: "/admin", seller: "/vendedor", workshop: "/oficina" }[
      user?.role
    ] || "/conta"
  );
}
