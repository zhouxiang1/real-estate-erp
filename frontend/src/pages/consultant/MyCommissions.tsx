import { useEffect, useState } from 'react';
import { Table, Tag, Card, Row, Col, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
import { commissionApi } from '../../services/api';

const MyCommissions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [stats, setStats] = useState({ total: { amount: 0 }, pending: { amount: 0 }, paid: { amount: 0 } });

  useEffect(() => {
    loadData();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await commissionApi.getStats();
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await commissionApi.list({ page, limit: 10 });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'orange', text: '待审核' },
    1: { color: 'blue', text: '待发放' },
    2: { color: 'green', text: '已发放' },
    3: { color: 'red', text: '已拒绝' },
  };

  const columns = [
    {
      title: '合同编号',
      dataIndex: ['transaction', 'contractNo'],
      key: 'contractNo',
      render: (no: string) => <a>{no}</a>
    },
    {
      title: '客户',
      dataIndex: ['transaction', 'customer', 'name'],
      key: 'customerName',
      render: (name: string) => <a onClick={() => navigate('/consultant/customers')}>{name}</a>
    },
    {
      title: '房源',
      dataIndex: ['transaction', 'room', 'unit'],
      key: 'room',
      render: (unit: string) => <a onClick={() => navigate('/consultant/rooms')}>{unit}</a>
    },
    { title: '佣金金额', dataIndex: 'amount', key: 'amount', render: (val: number) => `¥${val.toLocaleString()}` },
    { title: '比例', dataIndex: 'rate', key: 'rate', render: (val: number) => `${(val * 100).toFixed(1)}%` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
    },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => new Date(val).toLocaleDateString() },
  ];

  return (
    <div>
      <h2>我的佣金</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable>
            <Statistic title="佣金总额" value={stats.total?.amount || 0} prefix="¥" precision={0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic title="待发放" value={stats.pending?.amount || 0} prefix="¥" precision={0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic title="已发放" value={stats.paid?.amount || 0} prefix="¥" precision={0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data.data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: data.page,
          total: data.total,
          pageSize: data.limit,
          onChange: loadData,
        }}
        size="small"
      />
    </div>
  );
};

export default MyCommissions;
