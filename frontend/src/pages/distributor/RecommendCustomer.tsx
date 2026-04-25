import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Modal, Table, Tag, Row, Col, Statistic, Space } from 'antd';
import { PlusOutlined, UserOutlined, WechatOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { distributorApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';

const RecommendCustomer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, deal: 0, pending: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 这里需要调用API获取推荐客户列表
      // const res = await distributorApi.listCustomers(distributorId);
      // setCustomers(res.data || []);
      setCustomers([]);
      setStats({ total: 0, deal: 0, pending: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 需要传入分销商ID
      // await distributorApi.recommend(distributorId, values);
      message.success('推荐成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('推荐失败');
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'default', text: '待跟进' },
    1: { color: 'processing', text: '意向' },
    2: { color: 'success', text: '已成交' },
  };

  const columns = [
    {
      title: '客户姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <a><UserOutlined /> {name}</a>
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => <PhoneLink phone={phone} />
    },
    {
      title: '微信',
      dataIndex: 'wechat',
      key: 'wechat',
      render: (wechat: string) => wechat ? <Space><WechatOutlined /> {wechat}</Space> : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
    },
    { title: '推荐时间', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => val ? new Date(val).toLocaleDateString() : '-' },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <a onClick={() => navigate('/distributor/commissions')}>查看佣金</a>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>推荐客户</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          推荐客户
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable onClick={() => loadData()}>
            <Statistic title="推荐客户" value={stats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => loadData()}>
            <Statistic title="意向客户" value={stats.pending} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => navigate('/distributor/commissions')}>
            <Statistic title="成交客户" value={stats.deal} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无推荐记录，点击上方按钮推荐客户' }}
          size="small"
        />
      </Card>

      <Modal
        title="推荐客户"
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="客户姓名" rules={[{ required: true, message: '请输入客户姓名' }]}>
            <Input placeholder="请输入客户姓名" />
          </Form.Item>
          <Form.Item name="phone" label="客户电话" rules={[{ required: true, message: '请输入客户电话' }]}>
            <Input placeholder="请输入客户电话" />
          </Form.Item>
          <Form.Item name="wechat" label="微信">
            <Input placeholder="请输入微信号(选填)" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入备注信息(选填)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RecommendCustomer;
