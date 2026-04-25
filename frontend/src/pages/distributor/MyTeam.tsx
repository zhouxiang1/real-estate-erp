import { useEffect, useState } from 'react';
import { Table, Tag, Card, Row, Col, Statistic, Button } from 'antd';
import { UserOutlined, TeamOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PhoneLink from '../../components/PhoneLink';

const MyTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, active: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 需要调用API获取团队列表
      // const res = await distributorApi.getTeam(distributorId);
      // setTeam(res.data || []);
      setTeam([]);
      setStats({ total: 0, verified: 0, active: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <a><UserOutlined /> {name}</a>
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', render: (phone: string) => <PhoneLink phone={phone} /> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '正常' : '禁用'}</Tag>
    },
    {
      title: '实名认证',
      dataIndex: 'isVerified',
      key: 'isVerified',
      render: (verified: boolean) => <Tag color={verified ? 'green' : 'orange'}>{verified ? '已认证' : '未认证'}</Tag>
    },
    { title: '成交业绩', dataIndex: 'dealAmount', key: 'dealAmount', render: (val: number) => val ? `¥${val.toLocaleString()}` : '-' },
    { title: '加入时间', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => val ? new Date(val).toLocaleDateString() : '-' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>我的团队</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/distributor/customers')}>
          邀请成员
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable>
            <Statistic
              title="团队人数"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic
              title="已实名认证"
              value={stats.verified}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic
              title="活跃成员"
              value={stats.active}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="团队成员"
        extra={<a onClick={() => navigate('/distributor/commissions')}>查看佣金</a>}
      >
        <Table
          columns={columns}
          dataSource={team}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无团队成员，分享邀请链接邀请更多成员加入' }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default MyTeam;
