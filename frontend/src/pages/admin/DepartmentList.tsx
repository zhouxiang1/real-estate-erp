import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Tree, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { departmentApi } from '../../services/api';

const DepartmentList = () => {
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [flatData, setFlatData] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();
  const [deptOptions, setDeptOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    loadData();
    loadDeptOptions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await departmentApi.tree();
      const tree = buildTreeData(res.data);
      setTreeData(tree);
      setFlatData(res.data);
    } catch (error) {
      console.error(error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDeptOptions = async () => {
    try {
      const res = await departmentApi.select();
      const options = res.data.map((d: any) => ({
        value: d.id,
        label: d.name,
      }));
      setDeptOptions(options);
    } catch (error) {
      console.error(error);
    }
  };

  const buildTreeData = (departments: any[]): DataNode[] => {
    return departments.map((dept) => ({
      key: dept.id,
      title: dept.name,
      icon: <ApartmentOutlined />,
      children: dept.children?.length > 0 ? buildTreeData(dept.children) : undefined,
    }));
  };

  const handleEdit = (record: any) => {
    setEditingDept(record);
    setSelectedParent(record.parentId);
    form.setFieldsValue({
      name: record.name,
      parentId: record.parentId,
      sort: record.sort,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await departmentApi.delete(id);
      message.success('删除成功');
      loadData();
      loadDeptOptions();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (editingDept) {
        await departmentApi.update(editingDept.id, {
          name: values.name,
          parentId: values.parentId || null,
          sort: values.sort,
        });
        message.success('更新成功');
      } else {
        await departmentApi.create({
          name: values.name,
          parentId: values.parentId,
          sort: values.sort,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingDept(null);
      setSelectedParent(undefined);
      loadData();
      loadDeptOptions();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = (parentId?: string) => {
    setEditingDept(null);
    setSelectedParent(parentId);
    form.resetFields();
    form.setFieldsValue({ parentId: parentId });
    setModalVisible(true);
  };

  // 将树形数据展平用于表格展示
  const flattenTree = (data: any[], level = 0): any[] => {
    let result: any[] = [];
    data.forEach((dept) => {
      result.push({ ...dept, level });
      if (dept.children && dept.children.length > 0) {
        result = result.concat(flattenTree(dept.children, level + 1));
      }
    });
    return result;
  };

  const flattenedData = flattenTree(flatData);

  const columns = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <span style={{ paddingLeft: record.level * 24 }}>
          {name}
        </span>
      ),
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    {
      title: '用户数',
      dataIndex: '_count',
      key: 'userCount',
      width: 100,
      render: (count: any) => count?.users || 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<PlusOutlined />} onClick={() => handleAddChild(record.id)}>
            添加下级
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该部门？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>部门管理</h2>
        <Space>
          <Button icon={<ApartmentOutlined />} onClick={() => loadData()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddChild()}>
            新增部门
          </Button>
        </Space>
      </div>

      {/* 树形视图 */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 12 }}>组织架构</h4>
        <Tree
          showIcon
          showLine={{ showLeafIcon: false }}
          treeData={treeData}
          defaultExpandAll
          titleRender={(nodeData) => (
            <Space>
              <span>{String(nodeData.title ?? '')}</span>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  const dept = findDeptById(flatData, nodeData.key as string);
                  if (dept) handleEdit(dept);
                }}
              />
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(nodeData.key as string);
                }}
              />
            </Space>
          )}
        />
      </div>

      {/* 表格视图 */}
      <Table
        columns={columns}
        dataSource={flattenedData}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editingDept ? '编辑部门' : '新增部门'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          setEditingDept(null);
          form.resetFields();
          setSelectedParent(undefined);
        }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          <Form.Item name="parentId" label="上级部门" extra="不选择则为顶级部门">
            <Select
              placeholder="请选择上级部门"
              allowClear
              value={selectedParent}
              onChange={setSelectedParent}
              options={deptOptions.filter((opt) => opt.value !== editingDept?.id)}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="sort" label="排序" extra="数字越小越靠前">
            <Input type="number" placeholder="请输入排序号" defaultValue={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// 递归查找部门
const findDeptById = (departments: any[], id: string): any | null => {
  for (const dept of departments) {
    if (dept.id === id) return dept;
    if (dept.children && dept.children.length > 0) {
      const found = findDeptById(dept.children, id);
      if (found) return found;
    }
  }
  return null;
};

export default DepartmentList;
