import { useState } from 'react';
import { Button, Dropdown, message, Tag } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getHomePath, useAuthStore } from '../store/auth';

const testAccounts = [
  { label: '管理员', username: 'admin', password: 'admin123456', roleCode: 'admin' },
  { label: '营销经理', username: 'manager', password: '123456', roleCode: 'sales_manager' },
  { label: '置业顾问', username: 'consultant', password: '123456', roleCode: 'sales_consultant' },
  { label: '财务', username: 'finance', password: '123456', roleCode: 'finance_staff' },
  { label: '接访', username: 'reception', password: '123456', roleCode: 'receptionist' },
  { label: '渠道经理', username: 'channel', password: '123456', roleCode: 'channel_manager' },
  { label: '风控', username: 'risk', password: '123456', roleCode: 'risk_controller' },
  { label: '分销经纪人', username: 'distributor', password: '123456', roleCode: 'distributor' },
  { label: '内勤', username: 'office', password: '123456', roleCode: 'office_staff' },
];

const RoleSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const { login, user } = useAuthStore();
  const [switching, setSwitching] = useState(false);

  const currentRoleCode = user?.role?.code;

  const handleSwitch = async (account: (typeof testAccounts)[number]) => {
    setSwitching(true);
    try {
      await login(account.username, account.password);
      message.success(`已切换到${account.label}`);
      navigate(getHomePath(account.roleCode), { replace: true });
    } catch (error: any) {
      message.error(error.response?.data?.message || `切换到${account.label}失败`);
    } finally {
      setSwitching(false);
    }
  };

  const items = testAccounts.map((account) => ({
    key: account.username,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{account.label}</span>
        {currentRoleCode === account.roleCode && <Tag color="blue">当前</Tag>}
      </span>
    ),
    onClick: () => handleSwitch(account),
  }));

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Button
        size={compact ? 'small' : 'middle'}
        icon={<SwapOutlined />}
        loading={switching}
      >
        {compact ? '切换' : '切换角色'}
      </Button>
    </Dropdown>
  );
};

export default RoleSwitcher;
