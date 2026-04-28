import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, message, Tree, Card, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { roleApi } from '../../services/api';

const RoleList = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [permissions, setPermissions] = useState<{ key: string; name: string; group: string }[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
    loadPermissions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await roleApi.list();
      setData(res.data);
    } catch (error) {
      console.error(error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await roleApi.getPermissions();
      setPermissions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (record: any) => {
    setEditingRole(record);
    let perms: string[] = [];
    try {
      perms = JSON.parse(record.permissions || '[]');
    } catch {
      perms = [];
    }
    setSelectedPermissions(perms);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await roleApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (editingRole) {
        await roleApi.update(editingRole.id, { ...values, permissions: selectedPermissions });
        message.success('更新成功');
      } else {
        await roleApi.create({ ...values, permissions: selectedPermissions });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingRole(null);
      setSelectedPermissions([]);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (checkedKeys: any) => {
    setSelectedPermissions(checkedKeys);
  };

  // 按组分类权限
  const permissionGroups = permissions.reduce((acc, perm) => {
    if (!acc[perm.group]) {
      acc[perm.group] = [];
    }
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const columns = [
    { title: '角色名称', dataIndex: 'name', key: 'name' },
    { title: '角色代码', dataIndex: 'code', key: 'code' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms: string) => {
        try {
          const arr = JSON.parse(perms || '[]');
          return <Tag>{arr.length} 个权限</Tag>;
        } catch {
          return <Tag>0 个权限</Tag>;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>角色管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRole(null);
            setSelectedPermissions([]);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          新增角色
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data.data}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          setEditingRole(null);
          form.resetFields();
          setSelectedPermissions([]);
        }}
        width={800}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
                <Input placeholder="请输入角色名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="角色代码"
                rules={[
                  { required: true, message: '请输入角色代码' },
                  { pattern: /^[a-z_]+$/, message: '只能输入小写字母和下划线' },
                ]}
                extra={editingRole ? '' : '唯一标识，用于权限判断'}
              >
                <Input placeholder="如: sales_manager" disabled={!!editingRole} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>

          <Form.Item label="权限配置">
            <div style={{ border: '1px solid #d9d9d9', padding: 16, borderRadius: 8, maxHeight: 400, overflow: 'auto' }}>
              <Row gutter={[16, 16]}>
                {Object.entries(permissionGroups).map(([group, perms]) => (
                  <Col span={12} key={group}>
                    <Card size="small" title={group}>
                      {perms.map((perm: any) => (
                        <div key={perm.key} style={{ marginBottom: 8 }}>
                          <input
                            type="checkbox"
                            id={perm.key}
                            checked={selectedPermissions.includes(perm.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPermissions([...selectedPermissions, perm.key]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter((p) => p !== perm.key));
                              }
                            }}
                            style={{ marginRight: 8 }}
                          />
                          <label htmlFor={perm.key} style={{ cursor: 'pointer' }}>
                            {perm.name}
                          </label>
                        </div>
                      ))}
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleList;
