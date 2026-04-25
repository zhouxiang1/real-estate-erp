import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Input, Card, Row, Col, Statistic, Modal, Form, Select, InputNumber, Timeline, message, DatePicker, Empty, Tabs } from 'antd';
import { SearchOutlined, PlusOutlined, WechatOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';
import dayjs from 'dayjs';

const MyCustomers = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ total: 0, potential: 0, intention: 0, deal: 0 });
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // 从URL读取状态筛选
    const status = searchParams.get('status');
    const tab = searchParams.get('tab');

    let currentStatus: number | undefined;
    if (status !== null) {
      currentStatus = parseInt(status);
      setStatusFilter(currentStatus);
      setActiveTab(currentStatus === 0 ? 'potential' : currentStatus === 1 ? 'intention' : 'deal');
    } else if (tab === 'followup') {
      setActiveTab('followup');
    } else {
      setStatusFilter(undefined);
      setActiveTab('all');
    }

    loadData(1, keyword, currentStatus);
    loadStats();
  }, [searchParams]);

  const loadStats = async () => {
    try {
      const res = await customerApi.getStats();
      setStats({
        total: res.data.total || 0,
        potential: res.data.potential || 0,
        intention: res.data.intention || 0,
        deal: res.data.deal || 0,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // 根据状态获取对应的等级
  const getLevelByStatus = (status: number | undefined): string | undefined => {
    if (status === undefined) return undefined;
    const levelMap: Record<number, string> = { 0: 'C类', 1: 'B类', 2: 'A类' };
    return levelMap[status];
  };

  const loadData = async (page = 1, kw = keyword, status?: number) => {
    setLoading(true);
    try {
      const level = getLevelByStatus(status);
      const res = await customerApi.list({ page, limit: 10, keyword: kw, status, level });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'all') {
      setStatusFilter(undefined);
      loadData(1, keyword, undefined);
      navigate('/consultant/customers', { replace: true });
    } else if (key === 'potential') {
      setStatusFilter(0);
      loadData(1, keyword, 0);
      navigate('/consultant/customers?status=0', { replace: true });
    } else if (key === 'intention') {
      setStatusFilter(1);
      loadData(1, keyword, 1);
      navigate('/consultant/customers?status=1', { replace: true });
    } else if (key === 'deal') {
      setStatusFilter(2);
      loadData(1, keyword, 2);
      navigate('/consultant/customers?status=2', { replace: true });
    } else if (key === 'followup') {
      setStatusFilter(undefined);
      navigate('/consultant/customers?tab=followup', { replace: true });
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'default', text: '潜在' },
    1: { color: 'processing', text: '意向' },
    2: { color: 'success', text: '成交' },
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/consultant/customers/${record.id}`)}>{name}</a>
      )
    },
    { title: '电话', dataIndex: 'phone', key: 'phone', render: (phone: string) => <PhoneLink phone={phone} /> },
    { title: '微信', dataIndex: 'wechat', key: 'wechat', render: (wechat: string) => wechat ? <Space><WechatOutlined /> {wechat}</Space> : '-' },
    { title: '来源', dataIndex: 'source', key: 'source' },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => level ? <Tag color={level === 'A类' ? 'red' : level === 'B类' ? 'orange' : 'blue'}>{level}</Tag> : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
    },
    {
      title: '最近跟进',
      dataIndex: 'lastFollowupAt',
      key: 'lastFollowupAt',
      render: (date: string) => {
        if (!date) return <Tag color="default">未跟进</Tag>;
        const days = dayjs().diff(dayjs(date), 'day');
        if (days > 15) return <Tag color="red">{days}天前</Tag>;
        if (days > 7) return <Tag color="orange">{days}天前</Tag>;
        return <Tag color="green">{days}天前</Tag>;
      },
    },
    {
      title: '录入日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
      sorter: (a: any, b: any) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix();
      },
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<ClockCircleOutlined />} onClick={() => handleViewFollowups(record)}>跟进</Button>
          <Button type="link" size="small" onClick={() => navigate('/consultant/customers/edit', { state: { customer: record } })}>编辑</Button>
          <Button type="link" size="small" onClick={() => navigate('/consultant/transactions', { state: { customerId: record.id } })}>成交</Button>
        </Space>
      ),
    },
  ];

  const handleViewFollowups = async (record: any) => {
    setSelectedCustomer(record);
    setFollowupModalVisible(true);
    setFollowupLoading(true);
    try {
      const res = await customerApi.listFollowups(record.id);
      setFollowups(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFollowupLoading(false);
    }
  };

  const handleAddFollowup = async () => {
    try {
      const values = await form.validateFields();
      await customerApi.createFollowup(selectedCustomer.id, values);
      message.success('跟进记录已添加');
      form.resetFields();
      handleViewFollowups(selectedCustomer);
      loadData();
    } catch (error) {
      message.error('添加跟进记录失败');
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'call': return '电话跟进';
      case 'visit': return '上门拜访';
      case 'wechat': return '微信沟通';
      default: return '其他';
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>我的客户</h2>
        <Space>
          <Input.Search
            placeholder="姓名、手机号或后四位，按回车搜索"
            allowClear
            onSearch={(val) => { setKeyword(val); loadData(1, val); }}
            style={{ width: 260 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/consultant/customers/add')}>新增客户</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card hoverable onClick={() => handleTabChange('all')}>
            <Statistic title="客户总数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => handleTabChange('potential')}>
            <Statistic title="潜在客户" value={stats.potential} valueStyle={{ color: '#888' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => handleTabChange('intention')}>
            <Statistic title="意向客户" value={stats.intention} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => handleTabChange('deal')}>
            <Statistic title="成交客户" value={stats.deal} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <Tabs.TabPane tab={`全部客户 (${stats.total})`} key="all" />
          <Tabs.TabPane tab={`潜在客户 (${stats.potential})`} key="potential" />
          <Tabs.TabPane tab={`意向客户 (${stats.intention})`} key="intention" />
          <Tabs.TabPane tab={`成交客户 (${stats.deal})`} key="deal" />
        </Tabs>
      </Card>

      <Table
        columns={columns}
        dataSource={data.data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: data.page,
          total: data.total,
          pageSize: data.limit,
          onChange: (page) => loadData(page, keyword, statusFilter),
        }}
        size="small"
      />

      {/* 跟进记录弹窗 */}
      <Modal
        title={`客户跟进 - ${selectedCustomer?.name}`}
        open={followupModalVisible}
        onCancel={() => { setFollowupModalVisible(false); form.resetFields(); }}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Form form={form} layout="inline" onFinish={handleAddFollowup}>
            <Form.Item name="type" rules={[{ required: true }]} initialValue="call">
              <Select
                style={{ width: 100 }}
                options={[
                  { label: '电话', value: 'call' },
                  { label: '上门', value: 'visit' },
                  { label: '微信', value: 'wechat' },
                  { label: '其他', value: 'other' },
                ]}
              />
            </Form.Item>
            <Form.Item name="content" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input.TextArea placeholder="请输入跟进内容..." rows={1} style={{ width: 300 }} />
            </Form.Item>
            <Form.Item name="nextPlan" style={{ flex: 1 }}>
              <Input.TextArea placeholder="下一步计划(可选)" rows={1} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">添加</Button>
            </Form.Item>
          </Form>
        </div>

        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {followupLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
          ) : followups.length === 0 ? (
            <Empty description="暂无跟进记录" />
          ) : (
            <Timeline
              items={followups.map((item: any) => ({
                color: 'blue',
                children: (
                  <div key={item.id} style={{ padding: '8px 0' }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {getTypeText(item.type)} - {item.user?.name || '未知'}
                    </div>
                    <div style={{ color: '#666', marginTop: 4 }}>{item.content}</div>
                    {item.nextPlan && (
                      <div style={{ color: '#1890ff', marginTop: 4, fontSize: 12 }}>
                        下一步计划: {item.nextPlan}
                      </div>
                    )}
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                      {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MyCustomers;
