import { useState } from 'react';
import { Button, Card, Form, Input, InputNumber, message, Modal, Table, Tag, Row, Col, Statistic, Alert } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { distributorApi } from '../../services/api';

const Withdraw = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCommission: 0, paidCommission: 0, pendingCommission: 0 });

  // 模拟数据
  useState(() => {
    setWithdrawals([]);
    setStats({ totalCommission: 0, paidCommission: 0, pendingCommission: 0 });
  });

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // await distributorApi.withdraw(distributorId, values);
      message.success('提现申请已提交，预计1-3个工作日到账');
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('提现失败');
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'orange', text: '待审核' },
    1: { color: 'blue', text: '审核通过' },
    2: { color: 'green', text: '已打款' },
    3: { color: 'red', text: '已拒绝' },
  };

  const columns = [
    {
      title: '提现金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <a>¥{val?.toLocaleString()}</a>
    },
    { title: '手续费', dataIndex: 'fee', key: 'fee', render: (val: number) => `¥${val?.toLocaleString() || 0}` },
    { title: '实际到账', dataIndex: 'actualAmount', key: 'actualAmount', render: (val: number) => `¥${val?.toLocaleString() || 0}` },
    { title: '银行', dataIndex: 'bankName', key: 'bankName' },
    { title: '卡号', dataIndex: 'bankAccount', key: 'bankAccount', render: (val: string) => val ? `****${val.slice(-4)}` : '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
    },
    { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => val ? new Date(val).toLocaleDateString() : '-' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>提现申请</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          申请提现
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable onClick={() => navigate('/distributor/commissions')}>
            <Statistic
              title="可提现金额"
              value={stats.totalCommission - stats.paidCommission}
              prefix="¥"
              precision={0}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic
              title="待审核"
              value={0}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable>
            <Statistic
              title="已提现"
              value={stats.paidCommission || 0}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Alert
        message="提现说明"
        description="1. 提现申请提交后，预计1-3个工作日内到账。2. 提现手续费为1%，最低2元。3. 每日提现次数限制为3次。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Table
          columns={columns}
          dataSource={withdrawals}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无提现记录' }}
          size="small"
        />
      </Card>

      <Modal
        title="申请提现"
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="amount" label="提现金额" rules={[{ required: true, message: '请输入提现金额' }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入提现金额" />
          </Form.Item>
          <Form.Item name="bankName" label="银行名称" rules={[{ required: true, message: '请输入银行名称' }]}>
            <Input placeholder="如：中国工商银行" />
          </Form.Item>
          <Form.Item name="bankAccount" label="银行卡号" rules={[{ required: true, message: '请输入银行卡号' }]}>
            <Input placeholder="请输入银行卡号" />
          </Form.Item>
          <Form.Item name="accountName" label="持卡人姓名" rules={[{ required: true, message: '请输入持卡人姓名' }]}>
            <Input placeholder="请输入持卡人姓名" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Withdraw;
