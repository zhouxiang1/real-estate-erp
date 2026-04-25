import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Card, Row, Col, Statistic, Modal, Form, Input, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { transactionApi, customerApi, projectApi } from '../../services/api';

const TransactionList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [modalVisible, setModalVisible] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stats, setStats] = useState({ count: 0, totalAmount: 0 });
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [custRes, roomRes] = await Promise.all([
        customerApi.list({ page: 1, limit: 100 }),
        projectApi.listRooms({ limit: 500 }),
      ]);
      setCustomers(custRes.data.data || []);
      setRooms(roomRes.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const [txRes, statsRes] = await Promise.all([
        transactionApi.list({ page, limit: 10 }),
        transactionApi.getStats(),
      ]);
      setData(txRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    try {
      await transactionApi.create(values);
      message.success('成交录入成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('录入失败');
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'processing', text: '待付款' },
    1: { color: 'success', text: '已付清' },
    2: { color: 'default', text: '已取消' },
  };

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      render: (no: string) => <a>{no}</a>
    },
    {
      title: '客户',
      dataIndex: ['customer', 'name'],
      key: 'customerName',
      render: (name: string, record: any) => (
        <a onClick={() => navigate('/consultant/customers')}>{name}</a>
      )
    },
    {
      title: '房源',
      dataIndex: ['room', 'unit'],
      key: 'room',
      render: (unit: string, record: any) => (
        <a onClick={() => navigate('/consultant/rooms')}>{unit}</a>
      )
    },
    { title: '成交金额', dataIndex: 'totalPrice', key: 'totalPrice', render: (val: number) => `¥${val.toLocaleString()}` },
    { title: '已收金额', dataIndex: 'paidAmount', key: 'paidAmount', render: (val: number) => `¥${val.toLocaleString()}` },
    { title: '签约日期', dataIndex: 'signDate', key: 'signDate', render: (val: string) => new Date(val).toLocaleDateString() },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>成交录入</h2>
        <Button type="primary" onClick={() => setModalVisible(true)}>新增成交</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable onClick={() => navigate('/consultant/customers')}>
            <Statistic title="成交套数" value={stats.count} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic title="成交总额" value={stats.totalAmount} prefix="¥" precision={0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic title="成交总额" value={stats.totalAmount || 0} prefix="¥" precision={0} valueStyle={{ color: '#52c41a' }} />
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
      <Modal
        title="成交录入"
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="customerId" label="客户" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="搜索客户"
              optionFilterProp="children"
              options={customers.map(c => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="roomId" label="房源" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="搜索房源"
              optionFilterProp="children"
              options={rooms.map(r => ({ label: `${r.building?.name} - ${r.unit}`, value: r.id }))}
            />
          </Form.Item>
          <Form.Item name="totalPrice" label="成交金额" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="signDate" label="签约日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TransactionList;
