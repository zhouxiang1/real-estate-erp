import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  Input,
  Button,
  Space,
  Tag,
  message,
} from 'antd';
import {
  SearchOutlined,
  ExportOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { reportApi, projectApi } from '../../services/api';

const SalesReport = () => {
  const [loading, setLoading] = useState(false);
  const [complexes, setComplexes] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [filters, setFilters] = useState({
    complexId: undefined as string | undefined,
    status: [] as number[],
    keyword: undefined as string | undefined,
  });
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  useEffect(() => {
    loadComplexes();
    loadData();
  }, []);

  const loadComplexes = async () => {
    try {
      const res = await projectApi.listComplex({ limit: 100 });
      setComplexes(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.complexId) params.complexId = filters.complexId;
      if (filters.status && filters.status.length > 0) params.status = filters.status.join(',');
      if (filters.keyword) params.keyword = filters.keyword;

      const res = await reportApi.getSalesReport(params);
      setData(res.data.data || []);
      setStats(res.data.stats || {});
    } catch (error) {
      console.error(error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setFilters({
      complexId: undefined,
      status: [],
      keyword: undefined,
    });
    loadData();
  };

  const handleExport = () => {
    if (data.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    const exportData = selectedRows.length > 0 ? selectedRows : data;

    const excelData = exportData.map((item, index) => ({
      '序号': index + 1,
      '楼盘名称': item.complexName,
      '楼盘地址': item.complexAddress,
      '开发商': item.developer,
      '楼栋': item.buildingName,
      '房号': item.unit,
      '楼层': item.floor,
      '户型': item.roomType,
      '面积(㎡)': item.area,
      '预测面积(㎡)': item.predictArea || '-',
      '实测面积(㎡)': item.actualArea || '-',
      '单价(元/㎡)': item.price,
      '总价(元)': item.totalPrice,
      '状态': item.status,
      '客户姓名': item.customerName || '-',
      '客户电话': item.customerPhone || '-',
      '客户来源': item.customerSource || '-',
      '置业顾问': item.salesPersonName || '-',
      '认购日期': item.subscribeDate ? dayjs(item.subscribeDate).format('YYYY-MM-DD') : '-',
      '签约日期': item.signDate ? dayjs(item.signDate).format('YYYY-MM-DD') : '-',
      '合同编号': item.contractNo || '-',
      '已付款金额(元)': item.paidAmount || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '销售报表');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 8 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];

    const fileName = `销售报表_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    message.success(`导出成功：${fileName}`);
  };

  const statusOptions = [
    { label: '待售', value: 0, color: 'green' },
    { label: '已售', value: 1, color: 'red' },
    { label: '预留', value: 2, color: 'orange' },
    { label: '认购', value: 3, color: 'blue' },
    { label: '已签', value: 4, color: 'purple' },
  ];

  const columns = [
    { title: '楼盘', dataIndex: 'complexName', key: 'complexName', width: 120, fixed: 'left' as const },
    { title: '楼栋', dataIndex: 'buildingName', key: 'buildingName', width: 80 },
    { title: '房号', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '楼层', dataIndex: 'floor', key: 'floor', width: 60 },
    { title: '户型', dataIndex: 'roomType', key: 'roomType', width: 100 },
    { title: '面积(㎡)', dataIndex: 'area', key: 'area', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string, record: any) => {
        const option = statusOptions.find((o) => o.value === record.statusCode);
        return <Tag color={option?.color}>{status}</Tag>;
      },
    },
    { title: '客户姓名', dataIndex: 'customerName', key: 'customerName', width: 100 },
    { title: '客户电话', dataIndex: 'customerPhone', key: 'customerPhone', width: 120 },
    { title: '总价(元)', dataIndex: 'totalPrice', key: 'totalPrice', width: 120 },
    { title: '置业顾问', dataIndex: 'salesPersonName', key: 'salesPersonName', width: 100 },
    {
      title: '签约日期',
      dataIndex: 'signDate',
      key: 'signDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
  ];

  const rowSelection = {
    onChange: (selectedRowKeys: any, selectedRows: any[]) => {
      setSelectedRows(selectedRows);
    },
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>楼盘销售报表</h2>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card><Statistic title="总房间数" value={stats.totalRooms || 0} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="待售" value={stats.availableRooms || 0} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="认购" value={stats.subscribedRooms || 0} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="已签" value={stats.contractedRooms || 0} valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="已售" value={stats.soldRooms || 0} valueStyle={{ color: '#f5222d' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="成交总额" value={stats.totalAmount || 0} prefix="¥" precision={0} /></Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择楼盘"
              allowClear
              value={filters.complexId}
              onChange={(value) => setFilters({ ...filters, complexId: value })}
              options={complexes.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Col>
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择状态"
              mode="multiple"
              allowClear
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              options={statusOptions}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="搜索房号/户型/客户"
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              allowClear
            />
          </Col>
          <Col span={7}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<FilterOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button type="default" icon={<ExportOutlined />} onClick={handleExport} disabled={data.length === 0}>
                导出Excel
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ marginBottom: 8, color: '#888' }}>
          {selectedRows.length > 0 ? `已选择 ${selectedRows.length} 条，将只导出选中数据` : `共 ${data.length} 条数据`}
        </div>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="unit"
          loading={loading}
          scroll={{ x: 1500 }}
          rowSelection={rowSelection}
          size="small"
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default SalesReport;
