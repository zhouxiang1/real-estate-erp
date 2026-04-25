import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Button, Space, Timeline, Form, Input, Select, message, Descriptions, Divider, Statistic } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { ArrowLeftOutlined, WechatOutlined } from '@ant-design/icons';
import { customerApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';
import dayjs from 'dayjs';

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [editingLevel, setEditingLevel] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadFollowups();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const res = await customerApi.get(id!);
      setCustomer(res.data);
    } catch (error) {
      console.error(error);
      message.error('加载客户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadFollowups = async () => {
    try {
      const res = await customerApi.listFollowups(id!);
      setFollowups(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddFollowup = async () => {
    try {
      const values = await form.validateFields();
      await customerApi.createFollowup(id!, values);
      message.success('跟进记录已添加');
      form.resetFields();
      loadFollowups();
      loadCustomer(); // 刷新客户信息更新时间
    } catch (error) {
      message.error('添加跟进记录失败');
    }
  };

  const handleUpdateLevel = async (level: string) => {
    try {
      await customerApi.update(id!, { level });
      message.success('客户等级已更新');
      setEditingLevel(false);
      loadCustomer();
    } catch (error) {
      message.error('更新等级失败');
    }
  };

  const handleUpdateStatus = async (status: number) => {
    try {
      // 状态变更时自动更新对应等级
      const levelMap: Record<number, string> = { 0: 'C类', 1: 'B类', 2: 'A类' };
      await customerApi.update(id!, { status, level: levelMap[status] });
      message.success('客户状态已更新');
      loadCustomer();
    } catch (error) {
      message.error('更新状态失败');
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'default', text: '潜在客户' },
    1: { color: 'processing', text: '意向客户' },
    2: { color: 'success', text: '成交客户' },
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'call': return '电话跟进';
      case 'visit': return '上门拜访';
      case 'wechat': return '微信沟通';
      default: return '其他';
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  if (!customer) {
    return <div style={{ padding: 24 }}>客户不存在</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
      </div>

      <Row gutter={16}>
        {/* 左侧：客户基本信息 */}
        <Col xs={24} lg={10}>
          <Card title="客户信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="姓名">{customer.name}</Descriptions.Item>
              <Descriptions.Item label="电话">
                <PhoneLink phone={customer.phone} />
              </Descriptions.Item>
              <Descriptions.Item label="微信">
                {customer.wechat ? <Space><WechatOutlined /> {customer.wechat}</Space> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="来源">{customer.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="等级">
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
                      color={customer.level === 'A类' ? 'red' : customer.level === 'B类' ? 'orange' : 'blue'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setEditingLevel(true)}
                    >
                      {customer.level || '-'}
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
              <Descriptions.Item label="身份证号">{customer.idCard || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{customer.remark || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Space>
            </Space>
          </Card>

          {/* 快速统计 */}
          <Card>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="跟进次数" value={followups.length} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最后跟进"
                  value={customer.lastFollowupAt ? dayjs(customer.lastFollowupAt).format('MM-DD') : '未跟进'}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 右侧：跟进记录 */}
        <Col xs={24} lg={14}>
          <Card
            title="跟进记录"
            extra={
              <Button type="link" onClick={() => navigate('/consultant/customers/add', { state: { customer } })}>
                编辑客户
              </Button>
            }
          >
            {/* 添加跟进表单 */}
            <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
              <Form form={form} layout="inline" onFinish={handleAddFollowup}>
                <Form.Item name="type" rules={[{ required: true }]} initialValue="call">
                  <Select
                    style={{ width: 90 }}
                    options={[
                      { label: '电话', value: 'call' },
                      { label: '上门', value: 'visit' },
                      { label: '微信', value: 'wechat' },
                      { label: '其他', value: 'other' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="content" rules={[{ required: true }]} style={{ flex: 1, minWidth: 200 }}>
                  <Input.TextArea placeholder="请输入跟进内容..." rows={1} />
                </Form.Item>
                <Form.Item name="nextPlan">
                  <Input.TextArea placeholder="下一步计划" rows={1} style={{ width: 150 }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">添加跟进</Button>
                </Form.Item>
              </Form>
            </div>

            {/* 跟进时间线 */}
            <div style={{ maxHeight: 500, overflow: 'auto' }}>
              {followups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无跟进记录</div>
              ) : (
                <Timeline
                  items={followups.map((item: any) => ({
                    color: 'blue',
                    children: (
                      <div key={item.id} style={{ padding: '8px 0' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {getTypeText(item.type)}
                          <span style={{ fontWeight: 'normal', color: '#666', marginLeft: 8 }}>
                            - {item.user?.name || '未知'}
                          </span>
                        </div>
                        <div style={{ color: '#333', marginTop: 4 }}>{item.content}</div>
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
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CustomerDetail;
