import { useEffect, type ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import ReadPage from './pages/ReadPage';
import ExercisePage from './pages/ExercisePage';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
