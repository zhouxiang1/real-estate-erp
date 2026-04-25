import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Card, Row, Col, Statistic, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { channelApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';

const PartnerList = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({ total: 0, active: 0 });

  useEffect(() => {
    loadData();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await channelApi.listPartners({ page: 1, limit: 100 });
      const partners = res.data.data || [];
      setStats({
        total: partners.length,
        active: partners.filter((p: any) => p.status === 1).length,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await channelApi.listPartners({ page, limit: 10 });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    try {
      await channelApi.createPartner(values);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
      loadStats();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const typeMap: Record<string, { text: string; color: string }> = {
    agency: { text: '中介', color: 'blue' },
    individual: { text: '个人', color: 'green' },
    platform: { text: '平台', color: 'purple' },
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (name: string) => <a>{name}</a> },
    { title: '编码', dataIndex: 'code', key: 'code' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={typeMap[type]?.color}>{typeMap[type]?.text || type}</Tag>
    },
    { title: '联系人', dataIndex: 'contact', key: 'contact' },
    { title: '电话', dataIndex: 'phone', key: 'phone', render: (phone: string) => <PhoneLink phone={phone} /> },
    { title: '佣金比例', dataIndex: 'commission', key: 'commission', render: (val: number) => `${(val * 100).toFixed(1)}%` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '启用' : '禁用'}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>渠道人员管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>新增渠道</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card hoverable>
            <Statistic title="渠道总数" value={stats.total} />
          </Card>
        </Col>
        <Col span={12}>
          <Card hoverable>
            <Statistic title="活跃渠道" value={stats.active} valueStyle={{ color: '#52c41a' }} />
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
        title="新增渠道"
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input placeholder="agency/individual/platform" />
          </Form.Item>
          <Form.Item name="contact" label="联系人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="commission" label="佣金比例">
            <Input type="number" step="0.01" placeholder="0.03 = 3%" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartnerList;
