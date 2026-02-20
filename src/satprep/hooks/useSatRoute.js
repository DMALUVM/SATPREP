import { useCallback, useEffect, useMemo, useState } from 'react';

const BASE_PATH = '/sat-prep';

function normalize(pathname) {
  if (!pathname.startsWith(BASE_PATH)) return '/';
  const route = pathname.slice(BASE_PATH.length) || '/';
  return route.startsWith('/') ? route : `/${route}`;
}

export function useSatRoute() {
  const [route, setRoute] = useState(() => normalize(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(normalize(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path) => {
    const finalPath = `${BASE_PATH}${path === '/' ? '' : path}`;
    if (window.location.pathname !== finalPath) {
      window.history.pushState({}, '', finalPath);
      setRoute(normalize(finalPath));
    }
  }, []);

  return useMemo(() => ({ route, navigate }), [route, navigate]);
}
