import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { approvalApi, roleApi, userApi } from '../../services/api';

const listFromResponse = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const ApprovalSystem = () => {
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowModalVisible, setWorkflowModalVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workflowForm] = Form.useForm();

  useEffect(() => {
    loadWorkflows();
    loadRolesAndUsers();
  }, []);

  const businessRoles = roles.filter((role) => role.code !== 'admin');
  const businessUsers = users.filter((user) => user.role?.code !== 'admin');

  const loadRolesAndUsers = async () => {
    try {
      const [roleRes, userRes] = await Promise.all([
        roleApi.list(),
        userApi.list({ limit: 200 }),
      ]);
      setRoles(listFromResponse(roleRes.data));
      setUsers(listFromResponse(userRes.data));
    } catch (error) {
      console.error(error);
    }
  };

  const loadWorkflows = async () => {
    setWorkflowLoading(true);
    try {
      const res = await approvalApi.listWorkflows();
      setWorkflows(res.data || []);
    } catch (error) {
      console.error(error);
      message.error('加载审批流程失败');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const openWorkflow = (workflow: any) => {
    setEditingWorkflow(workflow);
    workflowForm.setFieldsValue({
      name: workflow.name,
      module: workflow.module,
      action: workflow.action,
      description: workflow.description,
      enabled: workflow.enabled,
      nodes: (workflow.nodes || []).map((node: any) => ({
        name: node.name,
        sort: node.sort,
        approverType: node.approverType || 'role',
        approverRoleCode: node.approverRoleCode,
        approverUserId: node.approverUserId,
      })),
    });
    setWorkflowModalVisible(true);
  };

  const handleSaveWorkflow = async () => {
    try {
      const values = await workflowForm.validateFields();
      await approvalApi.updateWorkflow(editingWorkflow.id, values);
      message.success('审批流程已保存');
      setWorkflowModalVisible(false);
      loadWorkflows();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || '保存失败');
    }
  };

  const workflowColumns = [
    { title: '流程名称', dataIndex: 'name', key: 'name', width: 180 },
    { title: '流程编码', dataIndex: 'key', key: 'key', width: 230 },
    { title: '模块', dataIndex: 'module', key: 'module', width: 90, render: (v: string) => <Tag>{v}</Tag> },
    { title: '业务动作', dataIndex: 'action', key: 'action', width: 130 },
    {
      title: '审批节点',
      dataIndex: 'nodes',
      key: 'nodes',
      render: (nodes: any[]) => (
        <Space wrap>
          {(nodes || []).map((node) => (
            <Tag key={node.id} color="blue">
              {node.sort}. {node.name}
              {node.approverRoleCode ? ` / ${node.approverRoleCode}` : ''}
              {node.approverUser ? ` / ${node.approverUser.name}` : ''}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (enabled: boolean, record: any) => (
        <Switch
          checked={enabled}
          onChange={async (checked) => {
            await approvalApi.setWorkflowEnabled(record.id, checked);
            message.success(checked ? '已启用' : '已停用');
            loadWorkflows();
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => <Button type="link" icon={<EditOutlined />} onClick={() => openWorkflow(record)}>配置</Button>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>审批流系统</h2>
        <div style={{ color: '#5c6b73' }}>
          管理员只负责创建、启用和维护审批流程；具体审批由各业务端口按节点角色逐级处理。
        </div>
      </div>

      <Card title="业务审批流配置">
        <Table
          columns={workflowColumns}
          dataSource={workflows}
          rowKey="id"
          loading={workflowLoading}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={`配置审批流 - ${editingWorkflow?.name || ''}`}
        open={workflowModalVisible}
        onCancel={() => setWorkflowModalVisible(false)}
        onOk={handleSaveWorkflow}
        width={900}
      >
        <Form form={workflowForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="流程名称" rules={[{ required: true }]}> 
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="enabled" label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="module" label="业务模块" rules={[{ required: true }]}> 
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="action" label="业务动作" rules={[{ required: true }]}> 
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>审批节点</Divider>
          <Form.List name="nodes">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Card key={field.key} size="small">
                    <Row gutter={12} align="middle">
                      <Col span={5}>
                        <Form.Item {...field} name={[field.name, 'name']} label="节点名称" rules={[{ required: true }]}> 
                          <Input placeholder="如：经理审核" />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item {...field} name={[field.name, 'sort']} label="顺序" rules={[{ required: true }]}> 
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...field} name={[field.name, 'approverType']} label="审批人类型" rules={[{ required: true }]}> 
                          <Select options={[{ label: '按业务角色', value: 'role' }, { label: '指定业务人员', value: 'user' }]} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item noStyle shouldUpdate>
                          {({ getFieldValue }) => {
                            const type = getFieldValue(['nodes', field.name, 'approverType']) || 'role';
                            return type === 'user' ? (
                              <Form.Item {...field} name={[field.name, 'approverUserId']} label="指定业务人员" rules={[{ required: true }]}> 
                                <Select showSearch optionFilterProp="label" options={businessUsers.map((u) => ({ label: `${u.name} (${u.username})`, value: u.id }))} />
                              </Form.Item>
                            ) : (
                              <Form.Item {...field} name={[field.name, 'approverRoleCode']} label="审批角色" rules={[{ required: true }]}> 
                                <Select options={businessRoles.map((r) => ({ label: r.name, value: r.code }))} />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Button danger onClick={() => remove(field.name)}>删除节点</Button>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add({ approverType: 'role', sort: fields.length + 1 })}>新增节点</Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovalSystem;
