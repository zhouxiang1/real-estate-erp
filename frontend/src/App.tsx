import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import ManagerLayout from './layouts/ManagerLayout';
import ConsultantLayout from './layouts/ConsultantLayout';
import ChannelLayout from './layouts/ChannelLayout';
import DistributorLayout from './layouts/DistributorLayout';
import OfficeLayout from './layouts/OfficeLayout';

// Pages - Auth
import Login from './pages/auth/Login';

// Pages - Admin
import AdminDashboard from './pages/admin/Dashboard';
import UserList from './pages/admin/UserList';
import RoleList from './pages/admin/RoleList';
import DepartmentList from './pages/admin/DepartmentList';
import ApprovalSystem from './pages/admin/ApprovalSystem';

// Pages - Manager
import ManagerDashboard from './pages/manager/Dashboard';
import ProjectList from './pages/manager/ProjectList';
import Inventory from './pages/manager/Inventory';
import CustomerList from './pages/manager/CustomerList';
import CustomerDetail from './pages/manager/CustomerDetail';
import SalesReports from './pages/manager/SalesReports';
import CommissionList from './pages/manager/CommissionList';

// Pages - Consultant
import ConsultantDashboard from './pages/consultant/Dashboard';
import MyCustomers from './pages/consultant/MyCustomers';
import AddCustomer from './pages/consultant/AddCustomer';
import EditCustomer from './pages/consultant/EditCustomer';
import RoomSearch from './pages/consultant/RoomSearch';
import TransactionList from './pages/consultant/TransactionList';
import MyCommissions from './pages/consultant/MyCommissions';
import Profile from './pages/consultant/Profile';

// Pages - Channel
import ChannelDashboard from './pages/channel/Dashboard';
import CommissionAuditList from './pages/channel/CommissionAuditList';
import PartnerList from './pages/channel/PartnerList';
import AnomalyMonitor from './pages/channel/AnomalyMonitor';

// Pages - Distributor
import DistributorRegister from './pages/distributor/Register';
import DistributorDashboard from './pages/distributor/Dashboard';
import RecommendCustomer from './pages/distributor/RecommendCustomer';
import DistributorCommission from './pages/distributor/Commission';
import Withdraw from './pages/distributor/Withdraw';
import MyTeam from './pages/distributor/MyTeam';

// Pages - Office
import OfficeDashboard from './pages/office/Dashboard';
import OfficeProjects from './pages/office/Projects';
import OfficeBuildings from './pages/office/Buildings';
import OfficeRooms from './pages/office/Rooms';
import OfficeSales from './pages/office/Sales';
import SalesReport from './pages/office/SalesReport';
import Finance from './pages/office/Finance';
import ApprovalTaskCenter from './pages/approval/ApprovalTaskCenter';

// Protected Route Component
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, token, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && user.role && !roles.includes(user.role.code)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<Login />} />
        <Route path="/distributor/register" element={<DistributorRegister />} />

        {/* 销售经理端 */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute roles={['admin', 'sales_manager']}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="reports" element={<SalesReports />} />
          <Route path="commissions" element={<CommissionList />} />
          <Route path="approvals" element={<ApprovalTaskCenter />} />
        </Route>

        {/* 置业顾问端 */}
        <Route
          path="/consultant"
          element={
            <ProtectedRoute roles={['sales_consultant', 'receptionist']}>
              <ConsultantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/consultant/dashboard" replace />} />
          <Route path="dashboard" element={<ConsultantDashboard />} />
          <Route path="customers" element={<MyCustomers />} />
          <Route path="customers/add" element={<AddCustomer />} />
          <Route path="customers/edit" element={<EditCustomer />} />
          <Route path="rooms" element={<RoomSearch />} />
          <Route path="transactions" element={<TransactionList />} />
          <Route path="commissions" element={<MyCommissions />} />
          <Route path="profile" element={<Profile />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="approvals" element={<ApprovalTaskCenter />} />
        </Route>

        {/* 渠道风控端 */}
        <Route
          path="/channel"
          element={
            <ProtectedRoute roles={['admin', 'channel_manager', 'risk_controller']}>
              <ChannelLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/channel/dashboard" replace />} />
          <Route path="dashboard" element={<ChannelDashboard />} />
          <Route path="audits" element={<CommissionAuditList />} />
          <Route path="partners" element={<PartnerList />} />
          <Route path="anomalies" element={<AnomalyMonitor />} />
          <Route path="approvals" element={<ApprovalTaskCenter />} />
        </Route>

        {/* 全民分销端 */}
        <Route
          path="/distributor"
          element={
            <ProtectedRoute roles={['distributor']}>
              <DistributorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/distributor/dashboard" replace />} />
          <Route path="dashboard" element={<DistributorDashboard />} />
          <Route path="customers" element={<RecommendCustomer />} />
          <Route path="commissions" element={<DistributorCommission />} />
          <Route path="withdraw" element={<Withdraw />} />
          <Route path="team" element={<MyTeam />} />
          <Route path="approvals" element={<ApprovalTaskCenter />} />
        </Route>

        {/* 内勤端 */}
        <Route
          path="/office"
          element={
            <ProtectedRoute roles={['admin', 'office_staff', 'finance_staff']}>
              <OfficeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/office/dashboard" replace />} />
          <Route path="dashboard" element={<OfficeDashboard />} />
          <Route path="projects" element={<OfficeProjects />} />
          <Route path="buildings" element={<OfficeBuildings />} />
          <Route path="rooms" element={<OfficeRooms />} />
          <Route path="sales" element={<OfficeSales />} />
          <Route path="report" element={<SalesReport />} />
          <Route path="finance" element={<Finance />} />
          <Route path="approvals" element={<ApprovalTaskCenter />} />
        </Route>

        {/* 管理后台 */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="roles" element={<RoleList />} />
          <Route path="departments" element={<DepartmentList />} />
          <Route path="approvals" element={<ApprovalSystem />} />
        </Route>

        {/* 默认路由 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
