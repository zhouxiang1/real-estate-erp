import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Tag, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { transactionApi, projectApi } from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const SalesReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD')
  ]);
  const [stats, setStats] = useState({ count: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0, byComplex: [] });
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, txRes] = await Promise.all([
        transactionApi.getStats({ startDate: dateRange[0], endDate: dateRange[1] }),
        transactionApi.list({ page: 1, limit: 20, startDate: dateRange[0], endDate: dateRange[1] }),
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: any) => {
    if (dates) {
      setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
    }
  };

  const columns = [
    { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo' },
    {
      title: '客户',
      dataIndex: ['customer', 'name'],
      key: 'customerName',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/manager/customers/${record.customerId}`)}>{name}</a>
      )
    },
    {
      title: '房源',
      dataIndex: ['room', 'unit'],
      key: 'room',
      render: (unit: string, record: any) => (
        <a onClick={() => navigate('/manager/inventory')}>{unit}</a>
      )
    },
    { title: '成交金额', dataIndex: 'totalPrice', key: 'totalPrice', render: (val: number) => `¥${val.toLocaleString()}` },
    { title: '签约日期', dataIndex: 'signDate', key: 'signDate', render: (val: string) => new Date(val).toLocaleDateString() },
    { title: '置业顾问', dataIndex: ['salesPerson', 'name'], key: 'salesPerson' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>销售报表</h2>
        <RangePicker
          defaultValue={[dayjs().startOf('month'), dayjs().endOf('month')]}
          onChange={handleDateChange}
          format="YYYY-MM-DD"
        />
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/manager/customers')}>
            <Statistic title="成交套数" value={stats.count} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic title="成交总额" value={stats.totalAmount} precision={0} prefix="¥" />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic title="已收金额" value={stats.paidAmount} precision={0} prefix="¥" valueStyle={{ color: 'green' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic title="待收金额" value={stats.pendingAmount} precision={0} prefix="¥" valueStyle={{ color: 'red' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="按楼盘统计"
        hoverable
        onClick={() => navigate('/manager/projects')}
        style={{ marginBottom: 16 }}
      >
        <Table
          dataSource={stats.byComplex}
          rowKey="name"
          pagination={false}
          size="small"
          columns={[
            {
              title: '楼盘',
              dataIndex: 'name',
              key: 'name',
              render: (name: string) => <a>{name}</a>
            },
            {
              title: '成交套数',
              dataIndex: 'count',
              key: 'count',
              render: (count: number) => <a onClick={() => navigate('/manager/inventory')}>{count}</a>
            },
            { title: '成交金额', dataIndex: 'amount', key: 'amount', render: (val: number) => `¥${val.toLocaleString()}` },
          ]}
        />
      </Card>

      <Card title="最近成交" hoverable>
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          pagination={false}
          loading={loading}
          size="small"
        />
      </Card>
    </div>
  );
};

export default SalesReports;
