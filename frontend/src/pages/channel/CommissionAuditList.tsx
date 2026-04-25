import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, Row, Col, Statistic, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { commissionApi } from '../../services/api';

const CommissionAuditList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(0);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [stats, setStats] = useState({ pending: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 } });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
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
      const res = await commissionApi.list({ page, limit: 10, status: statusFilter });
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

  const typeMap: Record<string, string> = {
    sales: '销售佣金',
    channel: '渠道佣金',
    distributor: '分销佣金',
  };

  const handleAudit = async (id: string, action: 'approve' | 'reject') => {
    try {
      await commissionApi.audit(id, { action });
      message.success(action === 'approve' ? '审核通过' : '已拒绝');
      loadData();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '合同编号', dataIndex: ['transaction', 'contractNo'], key: 'contractNo' },
    {
      title: '客户',
      dataIndex: ['transaction', 'customer', 'name'],
      key: 'customerName',
      render: (name: string) => <a onClick={() => navigate('/channel/audits')}>{name}</a>
    },
    {
      title: '房源',
      dataIndex: ['transaction', 'room', 'unit'],
      key: 'room',
      render: (unit: string) => <a onClick={() => navigate('/channel/audits')}>{unit}</a>
    },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (val: number) => `¥${val.toLocaleString()}` },
    { title: '类型', dataIndex: 'type', key: 'type', render: (type: string) => <Tag>{typeMap[type] || type}</Tag> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 0 && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleAudit(record.id, 'approve')}>通过</Button>
              <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleAudit(record.id, 'reject')}>拒绝</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>佣金审核</h2>
        <Select
          style={{ width: 120 }}
          placeholder="筛选状态"
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
          <Card hoverable onClick={() => setStatusFilter(0)}>
            <Statistic title="待审核" value={stats.pending?.count || 0} suffix={`¥${(stats.pending?.amount || 0).toLocaleString()}`} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => setStatusFilter(1)}>
            <Statistic title="待发放" value={stats.approved?.count || 0} suffix={`¥${(stats.approved?.amount || 0).toLocaleString()}`} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => setStatusFilter(2)}>
            <Statistic title="已发放" value={stats.paid?.count || 0} suffix={`¥${(stats.paid?.amount || 0).toLocaleString()}`} valueStyle={{ color: '#52c41a' }} />
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

export default CommissionAuditList;
