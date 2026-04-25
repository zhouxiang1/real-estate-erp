import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Card, Row, Col, Statistic, message, Select, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { projectApi } from '../../services/api';

const { RangePicker } = DatePicker;

const OfficeProjects = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await projectApi.listComplex({ page, limit: 10 });
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setEditId(null);
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    form.setFieldsValue(record);
    setEditId(record.id);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editId) {
        await projectApi.updateComplex(editId, values);
        message.success('更新成功');
      } else {
        await projectApi.createComplex(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectApi.deleteComplex(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '楼盘名称', dataIndex: 'name', key: 'name' },
    { title: '地址', dataIndex: 'address', key: 'address' },
    { title: '开发商', dataIndex: 'developer', key: 'developer' },
    { title: '总栋数', dataIndex: 'totalBuild', key: 'totalBuild' },
    { title: '总套数', dataIndex: 'totalUnits', key: 'totalUnits' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>项目管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增楼盘</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="楼盘总数" value={data.total} /></Card>
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
      />

      <Modal
        title={editId ? '编辑楼盘' : '新增楼盘'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="楼盘名称" rules={[{ required: true }]}>
            <Input placeholder="请输入楼盘名称" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true }]}>
            <Input placeholder="请输入楼盘地址" />
          </Form.Item>
          <Form.Item name="developer" label="开发商" rules={[{ required: true }]}>
            <Input placeholder="请输入开发商名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="totalBuild" label="总栋数">
                <Input type="number" placeholder="如: 5" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="totalUnits" label="总套数">
                <Input type="number" placeholder="如: 500" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default OfficeProjects;
