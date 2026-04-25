import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Avatar, Tag, Space, Badge, Button, Tabs } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerApi, transactionApi, commissionApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';
import dayjs from 'dayjs';

const ConsultantDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customerStats, setCustomerStats] = useState({ total: 0, potential: 0, intention: 0, deal: 0 });
  const [salesStats, setSalesStats] = useState({ count: 0, totalAmount: 0 });
  const [commissionStats, setCommissionStats] = useState({ total: { amount: 0 }, pending: { amount: 0 } });
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [followUpCustomers, setFollowUpCustomers] = useState({ potential: [], intention: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, salesRes, commRes, custListRes] = await Promise.all([
        customerApi.getStats(),
        transactionApi.getStats(),
        commissionApi.getStats(),
        customerApi.list({ page: 1, limit: 50 }),
      ]);
      setCustomerStats({
        total: custRes.data.total || 0,
        potential: custRes.data.potential || 0,
        intention: custRes.data.intention || 0,
        deal: custRes.data.deal || 0,
      });
      setSalesStats(salesRes.data);
      setCommissionStats(commRes.data);
      setRecentCustomers(custListRes.data.data || []);

      // 按状态分组需要跟进的客户（同时按等级筛选）
      const now = dayjs();
      const customers = custListRes.data.data || [];

      // 潜在客户=C类，意向客户=B类
      const potentialOverdue = customers.filter((c: any) => {
        if (c.status !== 0) return false; // 只看潜在客户
        if (c.level !== 'C类') return false; // 只看C类客户
        if (!c.lastFollowupAt) return true;
        return now.diff(dayjs(c.lastFollowupAt), 'day') >= 7;
      });

      const intentionOverdue = customers.filter((c: any) => {
        if (c.status !== 1) return false; // 只看意向客户
        if (c.level !== 'B类') return false; // 只看B类客户
        if (!c.lastFollowupAt) return true;
        return now.diff(dayjs(c.lastFollowupAt), 'day') >= 7;
      });

      setFollowUpCustomers({
        potential: potentialOverdue.slice(0, 5),
        intention: intentionOverdue.slice(0, 5),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFollowUpDays = (lastFollowupAt: string) => {
    if (!lastFollowupAt) return { text: '未跟进', color: 'red', days: 999 };
    const days = dayjs().diff(dayjs(lastFollowupAt), 'day');
    if (days >= 15) return { text: `${days}天未跟进`, color: 'red', days };
    if (days >= 7) return { text: `${days}天未跟进`, color: 'orange', days };
    return { text: `${days}天前`, color: 'green', days };
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'default', text: '潜在' },
    1: { color: 'processing', text: '意向' },
    2: { color: 'success', text: '成交' },
  };

  const renderFollowUpList = (customers: any[], status: number, statusText: string) => {
    if (customers.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 20, color: '#52c41a' }}>
          {statusText}跟进正常
        </div>
      );
    }

    return (
      <>
        <List
          itemLayout="horizontal"
          dataSource={customers}
          renderItem={(item: any) => {
            const followInfo = getFollowUpDays(item.lastFollowupAt);
            return (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/consultant/customers/${item.id}`)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: followInfo.color === 'red' ? '#ff4d4f' : '#fa8c16' }}>
                      {item.name[0]}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <a>{item.name}</a>
                      <Tag color={followInfo.color}>{followInfo.text}</Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      <PhoneLink phone={item.phone} showIcon={false} />
                      {item.level && <Tag color={item.level === 'A类' ? 'red' : item.level === 'B类' ? 'orange' : 'blue'}>{item.level}</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Button type="link" onClick={() => navigate(`/consultant/customers?tab=followup&status=${status}`)}>
            查看全部{statusText}
          </Button>
        </div>
      </>
    );
  };

  const tabItems = [
    {
      key: 'potential',
      label: (
        <span>
          潜在客户
          {followUpCustomers.potential.length > 0 && (
            <Badge count={followUpCustomers.potential.length} style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }} />
          )}
        </span>
      ),
      children: renderFollowUpList(followUpCustomers.potential, 0, '潜在客户'),
    },
    {
      key: 'intention',
      label: (
        <span>
          意向客户
          {followUpCustomers.intention.length > 0 && (
            <Badge count={followUpCustomers.intention.length} style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }} />
          )}
        </span>
      ),
      children: renderFollowUpList(followUpCustomers.intention, 1, '意向客户'),
    },
  ];

  return (
    <div>
      <h2>置业顾问工作台</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/consultant/customers')}>
            <Statistic title="我的客户" value={customerStats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/consultant/customers?status=0')}>
            <Statistic title="潜在客户" value={customerStats.potential} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/consultant/customers?status=1')}>
            <Statistic title="意向客户" value={customerStats.intention} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/consultant/transactions')}>
            <Statistic title="成交套数" value={salesStats.count} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            title="最近客户"
            hoverable
            onClick={() => navigate('/consultant/customers')}
            extra={<a>查看全部</a>}
          >
            <List
              itemLayout="horizontal"
              dataSource={recentCustomers}
              renderItem={(item: any) => (
                <List.Item style={{ cursor: 'pointer' }} onClick={() => navigate(`/consultant/customers/${item.id}`)}>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: statusMap[item.status]?.color === 'success' ? '#52c41a' : '#1890ff' }}>{item.name[0]}</Avatar>}
                    title={<a>{item.name}</a>}
                    description={
                      <Space>
                        <PhoneLink phone={item.phone} showIcon={false} />
                        <Tag color={statusMap[item.status]?.color}>{statusMap[item.status]?.text}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            {recentCustomers.length === 0 && <div style={{ textAlign: 'center', color: '#888' }}>暂无客户</div>}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title={
              <Space>
                <span>待跟进提醒</span>
                {(followUpCustomers.potential.length + followUpCustomers.intention.length) > 0 && (
                  <Badge count={followUpCustomers.potential.length + followUpCustomers.intention.length} style={{ backgroundColor: '#ff4d4f' }} />
                )}
              </Space>
            }
          >
            <Tabs items={tabItems} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConsultantDashboard;
