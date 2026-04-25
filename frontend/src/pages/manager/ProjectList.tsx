import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Card, Row, Col, Statistic, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HomeOutlined } from '@ant-design/icons';
import { projectApi } from '../../services/api';

const ProjectList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await projectApi.listComplex({ page, limit: 10 });
      setData(res.data);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await projectApi.createComplex(values);
      message.success('创建成功');
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const columns = [
    {
      title: '楼盘名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <a><HomeOutlined /> {name}</a>
    },
    { title: '地址', dataIndex: 'address', key: 'address' },
    { title: '开发商', dataIndex: 'developer', key: 'developer' },
    {
      title: '楼栋',
      dataIndex: 'buildings',
      key: 'buildingCount',
      render: (buildings: any[], record: any) => (
        <a onClick={() => navigate('/manager/inventory')}>{buildings?.length || 0} 栋</a>
      )
    },
    {
      title: '房源',
      dataIndex: 'totalUnits',
      key: 'totalUnits',
      render: (val: number, record: any) => (
        <a onClick={() => navigate('/manager/inventory')}>{val || 0} 套</a>
      )
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => new Date(val).toLocaleDateString() },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate('/manager/inventory')}>销控</Button>
          <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>项目管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增楼盘</Button>
      </div>

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
        title="新增楼盘"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="楼盘名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="developer" label="开发商" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList;
