import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Timeline, Button, Tag, Tabs, Table, Space, Modal, Form, Input, Select, message } from 'antd';
import { WechatOutlined, UserOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { customerApi, transactionApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('followup');
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState(false);
  const [followupForm] = Form.useForm();

  useEffect(() => {
    if (id) loadCustomer(id);
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    try {
      const res = await customerApi.get(customerId);
      setCustomer(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateLevel = async (level: string) => {
    try {
      await customerApi.update(id!, { level });
      message.success('客户等级已更新');
      setEditingLevel(false);
      loadCustomer(id!);
    } catch (error) {
      message.error('更新等级失败');
    }
  };

  const handleUpdateStatus = async (status: number) => {
    try {
      const levelMap: Record<number, string> = { 0: 'C类', 1: 'B类', 2: 'A类' };
      await customerApi.update(id!, { status, level: levelMap[status] });
      message.success('客户状态已更新');
      loadCustomer(id!);
    } catch (error) {
      message.error('更新状态失败');
    }
  };

  const handleAddFollowup = async (values: any) => {
    if (!id) return;
    try {
      await customerApi.createFollowup(id, values);
      message.success('添加跟进成功');
      setFollowupModalVisible(false);
      followupForm.resetFields();
      loadCustomer(id);
    } catch (error) {
      message.error('添加失败');
    }
  };

  if (!customer) return <div>加载中...</div>;

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'default', text: '潜在客户' },
    1: { color: 'processing', text: '意向客户' },
    2: { color: 'success', text: '成交客户' },
  };

  const levelColor: Record<string, string> = {
    'A类': 'red',
    'B类': 'orange',
    'C类': 'blue',
  };

  // 跟进记录表格列
  const followupColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => new Date(val).toLocaleString() },
    { title: '类型', dataIndex: 'type', key: 'type', render: (type: string) => {
      const map: Record<string, any> = {
        call: { text: '电话', color: 'blue' },
        visit: { text: '上门', color: 'green' },
        wechat: { text: '微信', color: 'cyan' },
        other: { text: '其他', color: 'default' },
      };
      return <Tag color={map[type]?.color || 'default'}>{map[type]?.text || type}</Tag>;
    }},
    { title: '跟进内容', dataIndex: 'content', key: 'content' },
    { title: '下次计划', dataIndex: 'nextPlan', key: 'nextPlan' },
    { title: '跟进人', dataIndex: ['user', 'name'], key: 'userName' },
  ];

  // 成交记录表格列
  const transactionColumns = [
    { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo' },
    { title: '房源', dataIndex: ['room', 'unit'], key: 'room', render: (_: any, record: any) => `${record.room?.building?.complex?.name} ${record.room?.building?.name} ${record.room?.unit}` },
    { title: '成交金额', dataIndex: 'totalPrice', key: 'totalPrice', render: (val: number) => `¥${val.toLocaleString()}` },
    { title: '签约日期', dataIndex: 'signDate', key: 'signDate', render: (val: string) => new Date(val).toLocaleDateString() },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: number) => (
      <Tag color={status === 1 ? 'success' : status === 0 ? 'processing' : 'default'}>
        {status === 1 ? '已付清' : status === 0 ? '待付款' : '已取消'}
      </Tag>
    )},
  ];

  // 佣金记录表格列
  const commissionColumns = [
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (val: number) => `¥${val.toLocaleString()}` },
    { title: '比例', dataIndex: 'rate', key: 'rate', render: (val: number) => `${(val * 100).toFixed(1)}%` },
    { title: '类型', dataIndex: 'type', key: 'type', render: (type: string) => {
      const map: Record<string, string> = { sales: '销售佣金', channel: '渠道佣金', distributor: '分销佣金' };
      return map[type] || type;
    }},
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: number) => (
      <Tag color={status === 2 ? 'success' : status === 1 ? 'blue' : status === 0 ? 'orange' : 'red'}>
        {status === 2 ? '已发放' : status === 1 ? '待发放' : status === 0 ? '待审核' : '已拒绝'}
      </Tag>
    )},
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => new Date(val).toLocaleDateString() },
  ];

  const tabItems = [
    {
      key: 'followup',
      label: `跟进记录 (${customer.followups?.length || 0})`,
      children: (
        <div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFollowupModalVisible(true)} style={{ marginBottom: 16 }}>
            添加跟进
          </Button>
          <Table
            columns={followupColumns}
            dataSource={customer.followups || []}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'transaction',
      label: `成交记录 (${customer.transactions?.length || 0})`,
      children: (
        <Table
          columns={transactionColumns}
          dataSource={customer.transactions || []}
          rowKey="id"
          pagination={false}
        />
      ),
    },
    {
      key: 'commission',
      label: '佣金记录',
      children: (
        <Table
          columns={commissionColumns}
          dataSource={customer.transactions?.flatMap((t: any) => t.commissions || []) || []}
          rowKey="id"
          pagination={false}
        />
      ),
    },
  ];

  return (
    <div>
      <Card title="客户信息" style={{ marginBottom: 16 }}>
        <Descriptions>
          <Descriptions.Item label="姓名">{customer.name}</Descriptions.Item>
          <Descriptions.Item label="电话">
            <Space>
              <PhoneLink phone={customer.phone} />
              <Button size="small" icon={<WechatOutlined />} />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="微信">{customer.wechat || '-'}</Descriptions.Item>
          <Descriptions.Item label="客户等级">
            {editingLevel ? (
              <Select
                value={customer.level}
                style={{ width: 120 }}
                onChange={handleUpdateLevel}
                onBlur={() => setEditingLevel(false)}
                autoFocus
                options={[
                  { label: 'A类-高意向', value: 'A类' },
                  { label: 'B类-中意向', value: 'B类' },
                  { label: 'C类-低意向', value: 'C类' },
                ]}
              />
            ) : (
              <Space>
                <Tag
                  color={levelColor[customer.level || '']}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEditingLevel(true)}
                >
                  {customer.level || '未评级'}
                </Tag>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditingLevel(true)} />
              </Space>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Select
              value={customer.status}
              style={{ width: 100 }}
              onChange={handleUpdateStatus}
              options={[
                { label: '潜在客户', value: 0 },
                { label: '意向客户', value: 1 },
                { label: '成交客户', value: 2 },
              ]}
            />
          </Descriptions.Item>
          <Descriptions.Item label="来源">{customer.source || '-'}</Descriptions.Item>
          <Descriptions.Item label="备注">{customer.remark || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <Modal
        title="添加跟进记录"
        open={followupModalVisible}
        onOk={() => followupForm.submit()}
        onCancel={() => setFollowupModalVisible(false)}
      >
        <Form form={followupForm} layout="vertical" onFinish={handleAddFollowup}>
          <Form.Item name="type" label="跟进方式" rules={[{ required: true }]}>
            <Select options={[
              { label: '电话', value: 'call' },
              { label: '上门', value: 'visit' },
              { label: '微信', value: 'wechat' },
              { label: '其他', value: 'other' },
            ]} />
          </Form.Item>
          <Form.Item name="content" label="跟进内容" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="nextPlan" label="下次计划">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerDetail;
