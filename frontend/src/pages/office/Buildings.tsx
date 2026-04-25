import { useEffect, useState, useRef } from 'react';
import { Table, Button, Space, Modal, Form, Input, Card, Row, Col, Statistic, message, Select, Upload, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { projectApi } from '../../services/api';
import * as XLSX from 'xlsx';

const OfficeBuildings = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [complexes, setComplexes] = useState<any[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editId, setEditId] = useState<string | null>(null);

  // 导入导出相关状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<any>(null);

  useEffect(() => {
    loadComplexes();
  }, []);

  useEffect(() => {
    if (selectedComplex) {
      loadBuildings();
    }
  }, [selectedComplex]);

  const loadComplexes = async () => {
    try {
      const res = await projectApi.listComplex({ limit: 100 });
      setComplexes(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedComplex(res.data.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadBuildings = async () => {
    if (!selectedComplex) return;
    setLoading(true);
    try {
      const res = await projectApi.listBuildings(selectedComplex);
      setData(res.data || []);
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
        await projectApi.updateBuilding(editId, values);
        message.success('更新成功');
      } else {
        await projectApi.createBuilding({ ...values, complexId: selectedComplex });
        message.success('创建成功');
      }
      setModalVisible(false);
      loadBuildings();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectApi.deleteBuilding(id);
      message.success('删除成功');
      loadBuildings();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 导出模板
  const handleExportTemplate = async (building: any) => {
    try {
      const res = await projectApi.exportRoomTemplate(building.id);
      const { filename, buffer } = res.data;

      // 解码base64并下载
      const byteCharacters = atob(buffer);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      message.success('模板导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 打开导入弹窗
  const handleOpenImport = (building: any) => {
    setSelectedBuilding(building);
    setImportResult(null);
    setImportModalVisible(true);
  };

  // 处理文件导入
  const handleImport = async (file: File) => {
    setImportLoading(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        message.error('Excel文件为空');
        setImportLoading(false);
        return false;
      }

      // 导入数据
      const res = await projectApi.importRooms(selectedBuilding.id, jsonData);
      setImportResult(res.data);

      if (res.data.success > 0) {
        message.success(`成功导入 ${res.data.success} 条数据`);
      }
      if (res.data.failed > 0) {
        message.warning(`失败 ${res.data.failed} 条数据`);
      }
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setImportLoading(false);
    }

    return false; // 不自动上传
  };

  const currentComplex = complexes.find(c => c.id === selectedComplex);

  const columns = [
    { title: '楼栋名称', dataIndex: 'name', key: 'name' },
    { title: '单元数', dataIndex: 'units', key: 'units' },
    { title: '楼层数', dataIndex: 'floors', key: 'floors' },
    { title: '每层户数', dataIndex: 'unitsPerFloor', key: 'unitsPerFloor' },
    { title: '总户数', dataIndex: 'totalUnits', key: 'totalUnits' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleExportTemplate(record)}>导出模板</Button>
          <Button type="link" size="small" icon={<UploadOutlined />} onClick={() => handleOpenImport(record)}>导入</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>楼栋管理</h2>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="选择楼盘"
            value={selectedComplex}
            onChange={setSelectedComplex}
            options={complexes.map(c => ({ label: c.name, value: c.id }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={!selectedComplex}>新增楼栋</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="当前楼盘" value={currentComplex?.name || '-'} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="楼栋数量" value={data.length} /></Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editId ? '编辑楼栋' : '新增楼栋'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="楼栋名称" rules={[{ required: true }]}>
            <Input placeholder="如: 1号楼" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="units" label="单元数" extra="如: 2个单元">
                <Input type="number" placeholder="如: 2" min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="floors" label="楼层数">
                <Input type="number" placeholder="如: 30" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unitsPerFloor" label="每层户数">
                <Input type="number" placeholder="如: 4" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 导入弹窗 */}
      <Modal
        title={`导入房源数据 - ${selectedBuilding?.name || ''}`}
        open={importModalVisible}
        onCancel={() => { setImportModalVisible(false); setImportResult(null); }}
        footer={[
          <Button key="close" onClick={() => { setImportModalVisible(false); setImportResult(null); }}>关闭</Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p>请选择要导入的 Excel 文件，文件应包含以下列：</p>
          <ul>
            <li>房号（必填）</li>
            <li>预测面积(㎡)</li>
            <li>实测面积(㎡)</li>
            <li>单价(元/㎡)</li>
            <li>总价(元)</li>
            <li>户型</li>
          </ul>
        </div>

        <Upload.Dragger
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleImport}
          disabled={importLoading}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .xlsx 或 .xls 格式的 Excel 文件
          </p>
        </Upload.Dragger>

        {importLoading && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            导入中...
          </div>
        )}

        {importResult && (
          <Alert
            type={importResult.success > 0 ? 'success' : 'warning'}
            style={{ marginTop: 16 }}
            message={`导入完成`}
            description={
              <div>
                <div>成功: {importResult.success} 条</div>
                <div>失败: {importResult.failed} 条</div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div style={{ marginTop: 8, maxHeight: 150, overflow: 'auto' }}>
                    {importResult.errors.map((err: string, idx: number) => (
                      <div key={idx} style={{ fontSize: 12, color: '#ff4d4f' }}>{err}</div>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        )}
      </Modal>
    </div>
  );
};

export default OfficeBuildings;
