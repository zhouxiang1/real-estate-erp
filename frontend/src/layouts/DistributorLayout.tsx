import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Drawer, Button, Space } from 'antd';
import {
  DashboardOutlined,
  UserAddOutlined,
  DollarOutlined,
  WalletOutlined,
  TeamOutlined,
  AuditOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import RoleSwitcher from '../components/RoleSwitcher';

const { Header, Content } = Layout;

// 底部标签栏配置
const tabItems = [
  { key: '/distributor/dashboard', icon: <DashboardOutlined />, label: '首页' },
  { key: '/distributor/customers', icon: <UserAddOutlined />, label: '客户' },
  { key: '/distributor/commissions', icon: <DollarOutlined />, label: '佣金' },
  { key: '/distributor/withdraw', icon: <WalletOutlined />, label: '提现' },
  { key: '/distributor/team', icon: <TeamOutlined />, label: '团队' },
  { key: '/distributor/approvals', icon: <AuditOutlined />, label: '审批' },
];

const DistributorLayout = () => {
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
    { key: '/distributor/dashboard', icon: <DashboardOutlined />, label: '分销工作台' },
    { key: '/distributor/customers', icon: <UserAddOutlined />, label: '推荐客户' },
    { key: '/distributor/commissions', icon: <DollarOutlined />, label: '佣金明细' },
    { key: '/distributor/withdraw', icon: <WalletOutlined />, label: '提现申请' },
    { key: '/distributor/team', icon: <TeamOutlined />, label: '我的团队' },
    { key: '/distributor/approvals', icon: <AuditOutlined />, label: '业务审批' },
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
            全民分销
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
          title="全民分销"
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
          // 移动端：顶部栏
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
            <span style={{ fontSize: 14, fontWeight: 500 }}>全民分销</span>
            <RoleSwitcher compact />
          </Header>
        ) : (
          // 桌面端：带标题的Header
          <Header style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>分销经纪人工作台</span>
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

      {/* 移动端底部导航栏 */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          boxShadow: '0 -1px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '8px 0',
          zIndex: 100
        }}>
          {tabItems.map(item => (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                color: location.pathname === item.key ? '#1890ff' : '#666',
                fontSize: 10
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 2 }}>{item.icon}</div>
              <div>{item.label}</div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default DistributorLayout;
