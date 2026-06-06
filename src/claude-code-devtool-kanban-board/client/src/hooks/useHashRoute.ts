import { useEffect, useState } from "react";

export type Route =
  | { name: "projects" }
  | { name: "board"; projectId: string; cardRef?: string };

function parse(hash: string): Route {
  const clean = hash.replace(/^#/, "");
  const m = clean.match(/^\/projects\/([^/]+)(?:\/([^/]+))?/);
  if (m) return { name: "board", projectId: m[1], cardRef: m[2] };
  return { name: "projects" };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function navigate(path: string): void {
  window.location.hash = path;
}
