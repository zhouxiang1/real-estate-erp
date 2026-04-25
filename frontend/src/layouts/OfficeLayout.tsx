import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Drawer, Button, Space } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  HomeOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  MenuOutlined,
  UserOutlined,
  BarChartOutlined,
  DollarOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import RoleSwitcher from '../components/RoleSwitcher';

const { Header, Content } = Layout;

const OfficeLayout = () => {
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
  const menuItems = roleCode === 'finance_staff' ? [
    { key: '/office/finance', icon: <DollarOutlined />, label: '财务' },
    { key: '/office/approvals', icon: <AuditOutlined />, label: '业务审批' },
  ] : [
    { key: '/office/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
    { key: '/office/projects', icon: <AppstoreOutlined />, label: '项目管理' },
    { key: '/office/buildings', icon: <HomeOutlined />, label: '楼栋管理' },
    { key: '/office/rooms', icon: <DatabaseOutlined />, label: '房间管理' },
    { key: '/office/sales', icon: <FileTextOutlined />, label: '销售录入' },
    { key: '/office/report', icon: <BarChartOutlined />, label: '销售报表' },
    { key: '/office/finance', icon: <DollarOutlined />, label: '财务' },
    { key: '/office/approvals', icon: <AuditOutlined />, label: '业务审批' },
  ];

  const handleMenuClick = (key: string) => {
    navigate(key);
    if (isMobile) setDrawerVisible(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Layout.Sider theme="dark" width={200} style={{ flexShrink: 0, position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}>
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
            {roleCode === 'finance_staff' ? '财务管理' : '内勤管理'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{ width: '100%' }}
          />
        </Layout.Sider>
      )}

      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <Drawer
          title={roleCode === 'finance_staff' ? '财务管理' : '内勤管理'}
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
        {isMobile ? (
          <Header style={{
            padding: '0 12px',
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
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
            />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{roleCode === 'finance_staff' ? '财务管理' : '内勤管理'}</span>
            <RoleSwitcher compact />
          </Header>
        ) : (
          <Header style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{roleCode === 'finance_staff' ? '财务工作台' : '内勤工作台'}</span>
            <Space>
              <RoleSwitcher />
              <div style={{ cursor: 'pointer' }} onClick={handleLogout}>
                退出
              </div>
            </Space>
          </Header>
        )}

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

export default OfficeLayout;
