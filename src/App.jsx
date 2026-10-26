import { Link, Route, Routes } from 'react-router-dom';
import { RequireAuth, useAuth } from './auth/AuthContext.jsx';
import { StoreProvider } from './data/store.jsx';
import Layout from './components/Layout.jsx';
import { Empty } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Verification from './pages/Verification.jsx';
import Listings from './pages/Listings.jsx';
import Reports from './pages/Reports.jsx';
import Disputes from './pages/Disputes.jsx';
import Users from './pages/Users.jsx';
import UserDetail from './pages/UserDetail.jsx';
import Activity from './pages/Activity.jsx';
import Finance from './pages/Finance.jsx';
import Announcements from './pages/Announcements.jsx';
import AuditLog from './pages/AuditLog.jsx';

const PAGES = [
  { path: '/', element: <Overview /> },
  { path: '/verification', element: <Verification /> },
  { path: '/listings', element: <Listings /> },
  { path: '/reports', element: <Reports /> },
  { path: '/disputes', element: <Disputes /> },
  { path: '/users', element: <Users /> },
  { path: '/users/:id', element: <UserDetail /> },
  { path: '/activity', element: <Activity /> },
  { path: '/finance', element: <Finance /> },
  { path: '/announcements', element: <Announcements /> },
  { path: '/audit', element: <AuditLog /> },
];

function NoAccess() {
  const { roleLabel } = useAuth();
  return (
    <Empty title="You don't have access to this page">
      Your role ({roleLabel}) can't open it. Ask a super admin if you need access. <Link className="link" to="/">Go to the overview</Link>
    </Empty>
  );
}

function Console() {
  const { user, can } = useAuth();
  return (
    <StoreProvider admin={user}>
      <Layout>
        <Routes>
          {PAGES.map((p) => (
            <Route key={p.path} path={p.path} element={can(p.path) ? p.element : <NoAccess />} />
          ))}
          <Route
            path="*"
            element={
              <Empty title="Page not found">
                <Link className="link" to="/">Go to the overview</Link>
              </Empty>
            }
          />
        </Routes>
      </Layout>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Console />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
