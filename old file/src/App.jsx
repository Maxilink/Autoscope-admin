import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { Empty } from './components/ui.jsx';
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/audit" element={<AuditLog />} />
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
  );
}
