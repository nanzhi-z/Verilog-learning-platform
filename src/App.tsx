import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';

// 路由级代码分割：练习页（含 CodeMirror）与仿真器按需加载，不进入首屏
const Home = lazy(() => import('./pages/Home'));
const ReadPage = lazy(() => import('./pages/ReadPage'));
const ExercisePage = lazy(() => import('./pages/ExercisePage'));
const Notebook = lazy(() => import('./pages/Notebook'));
const Cheatsheet = lazy(() => import('./pages/Cheatsheet'));

function RouteLoading() {
  return (
    <div className="route-loading">
      <span className="mono">加载中…</span>
    </div>
  );
}

/** remount page content when the route changes (params included) */
function ReKey({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <div key={pathname}>{children}</div>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <ScrollTop />
      <Header />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/read/:cid"
            element={
              <ReKey>
                <ReadPage />
              </ReKey>
            }
          />
          <Route
            path="/ex/:cid/:eid"
            element={
              <ReKey>
                <ExercisePage />
              </ReKey>
            }
          />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/cheatsheet" element={<Cheatsheet />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
