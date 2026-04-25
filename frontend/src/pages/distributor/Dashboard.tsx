import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Avatar, Tag, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { GiftOutlined, TeamOutlined, UserOutlined, DollarOutlined } from '@ant-design/icons';
import { distributorApi } from '../../services/api';

const DistributorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>({
    totalCommission: 0,
    paidCommission: 0,
    pendingCommission: 0,
    recommendedCount: 0,
    dealCount: 0,
    teamCount: 0,
  });

  useEffect(() => {
    // 需要获取当前分销商的ID，这里暂时用示例
    loadData('demo-id');
  }, []);

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const res = await distributorApi.getStats(id);
      setStats(res.data || {
        totalCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
        recommendedCount: 0,
        dealCount: 0,
        teamCount: 0,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>分销工作台</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/distributor/commissions')}>
            <Statistic
              title="佣金总额"
              value={stats.totalCommission || 0}
              prefix="¥"
              precision={0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/distributor/commissions')}>
            <Statistic
              title="已发放"
              value={stats.paidCommission || 0}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/distributor/commissions')}>
            <Statistic
              title="待发放"
              value={stats.pendingCommission || 0}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/distributor/customers')}>
            <Statistic
              title="推荐客户"
              value={stats.recommendedCount || 0}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            title="成交情况"
            hoverable
            onClick={() => navigate('/distributor/customers')}
            extra={<a>查看详情</a>}
          >
            <Statistic
              title="成交客户"
              value={stats.dealCount || 0}
              valueStyle={{ color: '#52c41a', fontSize: 36 }}
              suffix="人"
            />
            <div style={{ marginTop: 16, color: '#888' }}>
              成交客户可获得佣金奖励
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="我的团队"
            hoverable
            onClick={() => navigate('/distributor/team')}
            extra={<a>查看全部</a>}
          >
            <Statistic
              title="团队人数"
              value={stats.teamCount || 0}
              valueStyle={{ fontSize: 36 }}
            />
            <div style={{ marginTop: 16, color: '#888' }}>
              团队成员成交可获得额外奖励
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title="快速操作"
            extra={<a onClick={() => navigate('/distributor/customers')}>推荐客户</a>}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Button type="primary" block size="large" onClick={() => navigate('/distributor/customers')}>
                  推荐客户
                </Button>
              </Col>
              <Col span={8}>
                <Button block size="large" onClick={() => navigate('/distributor/commissions')}>
                  查看佣金
                </Button>
              </Col>
              <Col span={8}>
                <Button block size="large" onClick={() => navigate('/distributor/withdraw')}>
                  提现申请
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DistributorDashboard;
