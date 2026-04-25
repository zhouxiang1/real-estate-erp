import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Badge, Drawer, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  DollarOutlined,
  UserOutlined,
  AuditOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import RoleSwitcher from '../components/RoleSwitcher';

const { Header, Sider, Content } = Layout;

const ConsultantLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const roleCode = user?.role?.code;
  const menuItems = roleCode === 'receptionist' ? [
    { key: '/consultant/customers/add', icon: <PlusOutlined />, label: '来访登记' },
    { key: '/consultant/customers', icon: <TeamOutlined />, label: '客户查询' },
    { key: '/consultant/approvals', icon: <AuditOutlined />, label: '业务审批' },
  ] : [
    { key: '/consultant/dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/consultant/customers', icon: <TeamOutlined />, label: '我的客户' },
    { key: '/consultant/customers/add', icon: <PlusOutlined />, label: '客户录入' },
    { key: '/consultant/rooms', icon: <SearchOutlined />, label: '房源查询' },
    { key: '/consultant/transactions', icon: <FileTextOutlined />, label: '成交录入' },
    { key: '/consultant/commissions', icon: <DollarOutlined />, label: '我的佣金' },
    { key: '/consultant/approvals', icon: <AuditOutlined />, label: '业务审批' },
    { key: '/consultant/profile', icon: <UserOutlined />, label: '个人中心' },
  ];

  const handleMenuClick = (key: string) => {
    navigate(key);
    if (isMobile) setDrawerVisible(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'profile', label: '个人中心' },
    { key: 'settings', label: '系统设置' },
    { type: 'divider' as const },
    { key: 'logout', label: '退出登录' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider theme="dark" width={200} style={{ flexShrink: 0, position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}>
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            {roleCode === 'receptionist' ? '接访登记' : '置业顾问'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{ width: '100%' }}
          />
        </Sider>
      )}

      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <Drawer
          title={roleCode === 'receptionist' ? '接访登记' : '置业顾问'}
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={250}
          styles={{ body: { padding: 0 } }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{ width: '100%' }}
          />
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: isMobile ? '0 12px' : '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
              />
            )}
            <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 500 }}>
              {roleCode === 'receptionist' ? '接访登记工作台' : (isMobile ? '工作台' : '置业顾问工作台')}
            </span>
          </div>
          <Space size={isMobile ? 12 : 16}>
            <RoleSwitcher compact={isMobile} />
            <Badge count={3} size={isMobile ? 'small' : 'default'}>
              <span style={{ cursor: 'pointer', fontSize: isMobile ? 12 : 14 }}>消息</span>
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => key === 'logout' ? handleLogout() : null }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }} size={isMobile ? 4 : 8}>
                <Avatar size={isMobile ? 28 : 32} icon={<UserOutlined />} />
                {!isMobile && <span>{user?.name || user?.username}</span>}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{
          margin: isMobile ? 8 : 16,
          padding: isMobile ? 12 : 24,
          background: '#fff',
          minHeight: 280,
          overflow: 'auto'
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ConsultantLayout;
