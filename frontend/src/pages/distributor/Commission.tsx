import { useEffect, useState } from 'react';
import { Table, Tag, Card, Row, Col, Statistic, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { commissionApi } from '../../services/api';

const DistributorCommission = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [stats, setStats] = useState({ total: { amount: 0 }, pending: { amount: 0 }, paid: { amount: 0 } });

  useEffect(() => {
    loadStats();
    loadData();
  }, [statusFilter]);

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
      const res = await commissionApi.list({ page, limit: 10, status: statusFilter, type: 'distributor' });
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
      title: '房源',
      dataIndex: ['transaction', 'room', 'unit'],
      key: 'room',
      render: (unit: string, record: any) => (
        <a>{unit}</a>
      )
    },
    {
      title: '成交客户',
      dataIndex: ['transaction', 'customer', 'name'],
      key: 'customer',
      render: (name: string) => <a>{name}</a>
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>佣金明细</h2>
        <Select
          style={{ width: 120 }}
          placeholder="筛选状态"
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: '待审核', value: 0 },
            { label: '待发放', value: 1 },
            { label: '已发放', value: 2 },
            { label: '已拒绝', value: 3 },
          ]}
        />
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable onClick={() => { setStatusFilter(undefined); loadData(); }}>
            <Statistic title="佣金总额" value={stats.total?.amount || 0} prefix="¥" precision={0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => { setStatusFilter(0); loadData(); }}>
            <Statistic title="待审核" value={stats.pending?.amount || 0} prefix="¥" precision={0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => { setStatusFilter(2); loadData(); }}>
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

export default DistributorCommission;
