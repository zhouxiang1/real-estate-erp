import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Badge, Drawer, Button } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  HomeOutlined,
  TeamOutlined,
  BarChartOutlined,
  DollarOutlined,
  AuditOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import RoleSwitcher from '../components/RoleSwitcher';

const { Header, Sider, Content } = Layout;

const menuItems: any[] = [
  { key: '/manager/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/manager/projects', icon: <AppstoreOutlined />, label: '项目管理' },
  { key: '/manager/inventory', icon: <HomeOutlined />, label: '销控管理' },
  { key: '/manager/customers', icon: <TeamOutlined />, label: '客户管理' },
  { key: '/manager/reports', icon: <BarChartOutlined />, label: '销售报表' },
  { key: '/manager/commissions', icon: <DollarOutlined />, label: '佣金管理' },
  { key: '/manager/approvals', icon: <AuditOutlined />, label: '业务审批' },
];

const ManagerLayout = () => {
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

  const handleMenuClick = (key: string) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile' || key === 'settings') {
      // 暂未实现
    } else {
      navigate(key);
      if (isMobile) setDrawerVisible(false);
    }
  };

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
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '0 8px',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            明源云客ERP
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
          title="明源云客ERP"
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
              {isMobile ? '经理工作台' : '销售经理工作台'}
            </span>
          </div>
          <Space size={isMobile ? 12 : 16}>
            <RoleSwitcher compact={isMobile} />
            <Badge count={5} size={isMobile ? 'small' : 'default'}>
              <span style={{ cursor: 'pointer', fontSize: isMobile ? 12 : 14 }}>消息</span>
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => handleMenuClick(key) }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }} size={isMobile ? 4 : 8}>
                <Avatar size={isMobile ? 28 : 32} icon={<Avatar />} />
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

export default ManagerLayout;
