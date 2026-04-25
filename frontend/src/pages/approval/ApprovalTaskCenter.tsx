import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { approvalApi } from '../../services/api';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '审批中', color: 'blue' },
  1: { text: '已通过并执行', color: 'green' },
  2: { text: '已拒绝', color: 'red' },
  3: { text: '执行失败', color: 'volcano' },
};

const renderJson = (value: any) => {
  if (!value) return '-';
  return <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(value, null, 2)}</pre>;
};

const ApprovalTaskCenter = () => {
  const [activeTab, setActiveTab] = useState<'todo' | 'mine' | 'all'>('todo');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [status, setStatus] = useState<number | undefined>(0);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');

  useEffect(() => {
    loadRequests(1, pagination.limit, activeTab, status);
  }, [activeTab]);

  const loadRequests = async (
    page = pagination.page,
    limit = pagination.limit,
    scope = activeTab,
    selectedStatus = status,
  ) => {
    setLoading(true);
    try {
      const res = await approvalApi.listRequests({ page, limit, status: selectedStatus, scope });
      setRequests(res.data.data || []);
      setPagination({ page, limit, total: res.data.total || 0 });
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.message || '加载审批单失败');
    } finally {
      setLoading(false);
    }
  };

  const openRequest = async (record: any) => {
    try {
      const res = await approvalApi.getRequest(record.id);
      setSelectedRequest(res.data);
      setApprovalComment('');
      setModalVisible(true);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '加载审批详情失败');
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await approvalApi.approve(selectedRequest.id, approvalComment);
      message.success('审批通过，若为最后节点已自动执行业务动作');
      setModalVisible(false);
      loadRequests(1, pagination.limit);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '审批失败');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await approvalApi.reject(selectedRequest.id, approvalComment);
      message.success('已拒绝，该业务动作不会执行');
      setModalVisible(false);
      loadRequests(1, pagination.limit);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '拒绝失败');
    }
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', width: 200 },
    { title: '模块', dataIndex: 'module', key: 'module', width: 90, render: (v: string) => <Tag>{v}</Tag> },
    { title: '流程', dataIndex: 'workflow', key: 'workflow', width: 160, render: (workflow: any) => workflow?.name || '-' },
    { title: '申请人', dataIndex: ['requester', 'name'], key: 'requester', width: 110, render: (v: string) => v || '-' },
    {
      title: '当前节点',
      key: 'currentNode',
      width: 160,
      render: (_: any, record: any) => record.currentNode?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: number) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text || '未知'}</Tag>,
    },
    { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 110,
      render: (_: any, record: any) => <Button type="link" onClick={() => openRequest(record)}>{activeTab === 'todo' ? '审批' : '查看'}</Button>,
    },
  ];

  const canOperate = activeTab === 'todo' && selectedRequest?.status === 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>业务审批</h2>
        <div style={{ color: '#5c6b73' }}>处理当前角色节点的待审批事项，并查看自己发起的业务审批进度。</div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          const next = key as 'todo' | 'mine' | 'all';
          setActiveTab(next);
          setStatus(next === 'todo' ? 0 : undefined);
        }}
        items={[
          { key: 'todo', label: '待我审批' },
          { key: 'mine', label: '我发起的' },
          { key: 'all', label: '相关审批' },
        ]}
      />

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="审批状态"
              allowClear
              value={status}
              onChange={(value) => {
                setStatus(value);
                loadRequests(1, pagination.limit, activeTab, value);
              }}
              options={[
                { label: '审批中', value: 0 },
                { label: '已通过并执行', value: 1 },
                { label: '已拒绝', value: 2 },
                { label: '执行失败', value: 3 },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button icon={<ReloadOutlined />} onClick={() => loadRequests(1, pagination.limit)}>刷新</Button>
          </Col>
        </Row>
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1150 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onChange: (page, limit) => loadRequests(page, limit),
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title="审批详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={900}
        footer={canOperate ? [
          <Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>,
          <Popconfirm key="reject" title="确认拒绝该审批？" onConfirm={handleReject}>
            <Button danger icon={<CloseOutlined />}>拒绝</Button>
          </Popconfirm>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={handleApprove}>通过</Button>,
        ] : [<Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>]}
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="标题">{selectedRequest.title}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={statusMap[selectedRequest.status]?.color}>{statusMap[selectedRequest.status]?.text}</Tag></Descriptions.Item>
              <Descriptions.Item label="流程">{selectedRequest.workflow?.name}</Descriptions.Item>
              <Descriptions.Item label="当前节点">{selectedRequest.currentNode?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="申请人">{selectedRequest.requester?.name}</Descriptions.Item>
              <Descriptions.Item label="申请时间">{dayjs(selectedRequest.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="执行结果" span={2}>{selectedRequest.resultMessage || '-'}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="业务摘要">{renderJson(selectedRequest.summaryData)}</Card>
            <Card size="small" title="待执行参数">{renderJson(selectedRequest.payloadData)}</Card>
            <Card size="small" title="审批记录">
              <Table
                dataSource={selectedRequest.records || []}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: '节点', dataIndex: 'nodeName' },
                  { title: '审批人', dataIndex: ['approver', 'name'], render: (v: string) => v || '-' },
                  { title: '动作', dataIndex: 'action', render: (v: string) => v === 'approve' ? <Tag color="green">通过</Tag> : <Tag color="red">拒绝</Tag> },
                  { title: '意见', dataIndex: 'comment', render: (v: string) => v || '-' },
                  { title: '时间', dataIndex: 'createdAt', render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') },
                ]}
              />
            </Card>
            {canOperate && (
              <Input.TextArea
                rows={3}
                placeholder="审批意见（可选）"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalTaskCenter;
