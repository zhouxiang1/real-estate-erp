import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Input, Select, Card, Row, Col, Statistic, Tabs, Modal, message, Popconfirm, Timeline, Form, Input as InputAnt } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, ExportOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';
import dayjs from 'dayjs';

const CustomerList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [publicPoolData, setPublicPoolData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('my');
  const [stats, setStats] = useState({ total: 0, potential: 0, deal: 0, publicPool: 0, overdue: 0 });
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [form] = Form.useForm();
  const [overdueData, setOverdueData] = useState({ data: [], total: 0, page: 1, limit: 10 });

  const loadOverdueData = async (page = 1) => {
    try {
      const res = await customerApi.list({ page, limit: 10, status: 0 }); // 意向客户
      // 这里简化处理，实际应该后端提供专门的接口
      setOverdueData({ ...res.data, data: res.data.data || [] });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
    loadPublicPoolData();
    loadStats();
    loadOverdueData();
  }, [statusFilter, activeTab]);

  // 根据状态获取对应的等级
  const getLevelByStatus = (status: number | undefined): string | undefined => {
    if (status === undefined) return undefined;
    const levelMap: Record<number, string> = { 0: 'C类', 1: 'B类', 2: 'A类' };
    return levelMap[status];
  };

  const loadStats = async () => {
    try {
      const res = await customerApi.getStats();
      // 计算待跟进数量（7天以上未跟进的非成交客户，且等级匹配状态）
      const now = dayjs();
      const overdueCount = (data.data || []).filter((c: any) => {
        if (c.status === 2) return false;
        // 待跟进只统计C类和B类客户（匹配状态）
        if (c.status === 0 && c.level !== 'C类') return false;
        if (c.status === 1 && c.level !== 'B类') return false;
        if (!c.lastFollowupAt) return true;
        return now.diff(dayjs(c.lastFollowupAt), 'day') >= 7;
      }).length;
      setStats({
        total: res.data.total || 0,
        potential: res.data.potential || 0,
        deal: res.data.deal || 0,
        publicPool: res.data.publicPool || 0,
        overdue: overdueCount,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async (page = 1) => {
    if (activeTab !== 'my') return;
    setLoading(true);
    try {
      const level = getLevelByStatus(statusFilter);
      const res = await customerApi.list({ page, limit: 10, keyword, status: statusFilter, level });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicPoolData = async (page = 1) => {
    if (activeTab !== 'public') return;
    setLoading(true);
    try {
      const res = await customerApi.getPublicPoolList({ page, limit: 10 });
      setPublicPoolData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await customerApi.delete(id);
      message.success('删除成功');
      loadData();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleMoveToPublicPool = async (id: string) => {
    try {
      await customerApi.moveToPublicPool(id);
      message.success('已移入公共池');
      loadData();
      loadPublicPoolData();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleClaim = async (id: string) => {
    try {
      // 这里需要获取当前用户ID，暂时传空
      await customerApi.claimFromPublicPool(id, '');
      message.success('认领成功');
      loadPublicPoolData();
      loadStats();
    } catch (error) {
      message.error('认领失败');
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'default', text: '潜在' },
    1: { color: 'processing', text: '意向' },
    2: { color: 'success', text: '成交' },
  };

  const myColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/manager/customers/${record.id}`)}>{name}</a>
      )
    },
    { title: '电话', dataIndex: 'phone', key: 'phone', render: (phone: string) => <PhoneLink phone={phone} /> },
    { title: '来源', dataIndex: 'source', key: 'source' },
    { title: '等级', dataIndex: 'level', key: 'level', render: (level: string) => level ? <Tag color={level === 'A类' ? 'red' : level === 'B类' ? 'orange' : 'blue'}>{level}</Tag> : '-' },
    {
      title: '最后跟进',
      dataIndex: 'lastFollowupAt',
      key: 'lastFollowupAt',
      render: (val: string) => {
        if (!val) return <Tag color="red">未跟进</Tag>;
        const days = Math.floor((Date.now() - new Date(val).getTime()) / (1000 * 60 * 60 * 24));
        return days > 15 ? <Tag color="red">{days}天未跟进</Tag> : <Tag color="green">{days}天前</Tag>;
      }
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<ClockCircleOutlined />} onClick={() => handleViewFollowups(record)}>跟进</Button>
          <Button type="link" size="small" onClick={() => navigate(`/manager/customers/${record.id}`)}>详情</Button>
          <Button type="link" size="small" danger icon={<ExportOutlined />} onClick={() => handleMoveToPublicPool(record.id)}>移入公海</Button>
          <Popconfirm title="确定删除此客户吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const publicPoolColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/manager/customers/${record.id}`)}>{name}</a>
      )
    },
    { title: '电话', dataIndex: 'phone', key: 'phone', render: (phone: string) => <PhoneLink phone={phone} /> },
    { title: '来源', dataIndex: 'source', key: 'source' },
    { title: '等级', dataIndex: 'level', key: 'level', render: (level: string) => level ? <Tag>{level}</Tag> : '-' },
    {
      title: '录入日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
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
          <Button type="primary" size="small" onClick={() => handleClaim(record.id)}>认领</Button>
          <Popconfirm title="确定删除此客户吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'my',
      label: `我的客户 (${stats.total})`,
      children: (
        <Table
          columns={myColumns}
          dataSource={data.data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: data.page,
            total: data.total,
            pageSize: data.limit,
            onChange: (page) => loadData(page),
          }}
          size="small"
        />
      ),
    },
    {
      key: 'overdue',
      label: (
        <span>
          待跟进 {stats.overdue > 0 && <Tag color="red">{stats.overdue}</Tag>}
        </span>
      ),
      children: (
        <Table
          columns={myColumns}
          dataSource={overdueData.data.filter((c: any) => {
            if (c.status === 2) return false; // 排除已成交
            if (!c.lastFollowupAt) return true;
            const days = dayjs().diff(dayjs(c.lastFollowupAt), 'day');
            return days >= 7; // 7天以上未跟进
          })}
          rowKey="id"
          loading={loading}
          pagination={{
            current: overdueData.page,
            total: overdueData.total,
            pageSize: overdueData.limit,
            onChange: (page) => loadOverdueData(page),
          }}
          size="small"
        />
      ),
    },
    {
      key: 'public',
      label: <span><TeamOutlined /> 公共池 ({publicPoolData.total})</span>,
      children: (
        <Table
          columns={publicPoolColumns}
          dataSource={publicPoolData.data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: publicPoolData.page,
            total: publicPoolData.total,
            pageSize: publicPoolData.limit,
            onChange: (page) => loadPublicPoolData(page),
          }}
          size="small"
        />
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
        <h2>客户管理</h2>
        <Space>
          <Select
            style={{ width: 100 }}
            placeholder="状态筛选"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: '潜在', value: 0 },
              { label: '意向', value: 1 },
              { label: '成交', value: 2 },
            ]}
          />
          <Input.Search
            placeholder="姓名、手机号或后四位，按回车搜索"
            allowClear
            onSearch={(val) => { setKeyword(val); loadData(1); }}
            style={{ width: 260 }}
          />
          <Button type="primary" icon={<PlusOutlined />}>新增客户</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable onClick={() => { setActiveTab('my'); setStatusFilter(undefined); loadData(); }}>
            <Statistic title="我的客户" value={stats.total} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => { setStatusFilter(0); loadData(); }}>
            <Statistic title="潜在客户" value={stats.potential} valueStyle={{ color: '#888' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => setActiveTab('public')}>
            <Statistic title="公共池" value={publicPoolData.total || 0} valueStyle={{ color: '#faad14' }} prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); if (key === 'my') loadData(); else loadPublicPoolData(); }} items={tabItems} />
      </Card>

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
              <InputAnt.TextArea placeholder="请输入跟进内容..." rows={1} style={{ width: 300 }} />
            </Form.Item>
            <Form.Item name="nextPlan" style={{ flex: 1 }}>
              <InputAnt.TextArea placeholder="下一步计划(可选)" rows={1} style={{ width: 200 }} />
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
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无跟进记录</div>
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

export default CustomerList;
