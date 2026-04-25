import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Badge, Drawer, Button } from 'antd';
import {
  DashboardOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  WarningOutlined,
  UserOutlined,
  AuditOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import RoleSwitcher from '../components/RoleSwitcher';

const { Header, Sider, Content } = Layout;

const ChannelLayout = () => {
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

  const menuItems = [
    { key: '/channel/dashboard', icon: <DashboardOutlined />, label: '风控看板' },
    { key: '/channel/audits', icon: <CheckSquareOutlined />, label: '佣金审核' },
    { key: '/channel/partners', icon: <TeamOutlined />, label: '渠道管理' },
    { key: '/channel/anomalies', icon: <WarningOutlined />, label: '异常监控' },
    { key: '/channel/approvals', icon: <AuditOutlined />, label: '业务审批' },
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
            渠道风控
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
          title="渠道风控"
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
              {isMobile ? '风控看板' : '渠道风控工作台'}
            </span>
          </div>
          <Space size={isMobile ? 12 : 16}>
            <RoleSwitcher compact={isMobile} />
            <Badge count={2} size={isMobile ? 'small' : 'default'}>
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

export default ChannelLayout;
