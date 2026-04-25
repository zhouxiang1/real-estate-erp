import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Card, Row, Col, Statistic, message, Select, DatePicker, InputNumber, Tag, Descriptions, Dropdown, Divider } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, UserOutlined, SwapOutlined, FileTextOutlined, RollbackOutlined, ExclamationCircleOutlined, MoreOutlined } from '@ant-design/icons';
import { projectApi, transactionApi, customerApi, projectApi as projApi, userApi } from '../../services/api';
import PhoneLink from '../../components/PhoneLink';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const OfficeSales = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [complexes, setComplexes] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [customerDetailVisible, setCustomerDetailVisible] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);
  const [form] = Form.useForm();
  const [saleForm] = Form.useForm();
  const [editId, setEditId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, data: [] });
  const [stats, setStats] = useState({ count: 0, totalAmount: 0 });

  // 业务操作弹窗状态
  const [changeRoomModalVisible, setChangeRoomModalVisible] = useState(false);
  const [modifyModalVisible, setModifyModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [forfeitModalVisible, setForfeitModalVisible] = useState(false);
  const [changeRoomList, setChangeRoomList] = useState<any[]>([]); // 可售房间列表（换房用）

  // 业务操作表单
  const [changeRoomForm] = Form.useForm();
  const [modifyForm] = Form.useForm();
  const [refundForm] = Form.useForm();
  const [forfeitForm] = Form.useForm();

  // 更名和权益人弹窗状态
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [beneficiaryModalVisible, setBeneficiaryModalVisible] = useState(false);
  const [renameForm] = Form.useForm();
  const [beneficiaryForm] = Form.useForm();
  const [editingBeneficiary, setEditingBeneficiary] = useState<any>(null);

  useEffect(() => {
    loadComplexes();
    loadCustomers();
    loadConsultants();
    loadSales();
  }, []);

  useEffect(() => {
    if (selectedComplex) {
      loadBuildings(selectedComplex);
      loadRooms(selectedComplex);
    }
  }, [selectedComplex]);

  const loadComplexes = async () => {
    try {
      const res = await projApi.listComplex({ limit: 100 });
      setComplexes(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedComplex(res.data.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadBuildings = async (complexId: string) => {
    try {
      const res = await projApi.listBuildings(complexId);
      setBuildings(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRooms = async (complexId: string) => {
    try {
      const res = await projApi.listRooms({ complexId, limit: 500, status: 0 });
      setRooms(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadCustomers = async () => {
    try {
      // 加载所有客户用于关联
      const res = await customerApi.list({ limit: 1000 });
      setCustomers(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadConsultants = async () => {
    try {
      // 加载所有置业顾问
      const res = await userApi.list({ roleCode: 'sales_consultant' });
      setConsultants(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSales = async (page = 1) => {
    setLoading(true);
    try {
      const res = await transactionApi.list({ page, limit: 10 });
      setPagination({
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        data: res.data.data || []
      });
      setData(res.data.data || []);

      // 计算统计
      const statsRes = await transactionApi.getStats();
      setStats({
        count: statsRes.data.count || 0,
        totalAmount: statsRes.data.totalAmount || 0
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    saleForm.resetFields();
    setEditId(null);
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    // 编辑时设置原价（如果存在）或使用成交价作为原价
    const originalPrice = record.originalPrice || record.totalPrice;
    saleForm.setFieldsValue({
      ...record,
      originalPrice,
      discountType: record.discountType || 'none',
      discountValue: record.discountValue || 0,
      signDate: record.signDate ? dayjs(record.signDate) : null,
      draftSignDate: record.draftSignDate ? dayjs(record.draftSignDate) : null,
      onlineSignDate: record.onlineSignDate ? dayjs(record.onlineSignDate) : null,
      predictArea: record.predictArea || record.room?.predictArea || record.room?.area,
      actualArea: record.actualArea || record.room?.actualArea,
      areaDiff: record.areaDiff,
      areaDiffAmount: record.areaDiffAmount,
    });
    setSelectedRoom(record.room);
    setEditId(record.id);
    setModalVisible(true);
  };

  const handleView = (record: any) => {
    setSelectedRecord(record);
    setViewModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await saleForm.validateFields();
      const submitData = {
        ...values,
        signDate: values.signDate?.format('YYYY-MM-DD'),
        draftSignDate: values.draftSignDate?.format('YYYY-MM-DD'),
        onlineSignDate: values.onlineSignDate?.format('YYYY-MM-DD'),
        roomId: values.roomId,
        customerId: values.customerId,
        salesPersonId: values.salesPersonId,
        totalPrice: values.totalPrice,
        paidAmount: values.paidAmount || 0,
        predictArea: values.predictArea,
        actualArea: values.actualArea,
        areaDiff: values.areaDiff,
        areaDiffAmount: values.areaDiffAmount || 0,
      };

      if (editId) {
        await transactionApi.update(editId, submitData);
        message.success('更新成功');
      } else {
        await transactionApi.create(submitData);
        // 更新房间状态为已售
        await projApi.updateRoomStatus(values.roomId, 1);
        message.success('销售录入成功');
      }
      setModalVisible(false);
      loadSales();
      loadRooms(selectedComplex);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const roomOptions = rooms.map((r: any) => ({
    label: `${r.unit} (${r.area}m² / ${r.totalPrice}元)`,
    value: r.id,
    room: r,
  }));

  const handleRoomChange = (roomId: string) => {
    const room = rooms.find((r: any) => r.id === roomId);
    setSelectedRoom(room);
    if (room) {
      // 使用预测面积，如果没有则用原来的面积
      const predictArea = room.predictArea || room.area;
      saleForm.setFieldsValue({
        originalPrice: room.totalPrice,
        totalPrice: room.totalPrice,
        predictArea: predictArea,
        actualArea: room.actualArea || null,
        areaDiff: room.actualArea ? room.actualArea - predictArea : null,
        discountType: 'none',
        discountValue: 0,
      });
      // 如果有实测面积，计算面积差金额
      if (room.actualArea) {
        const areaDiff = room.actualArea - predictArea;
        const areaDiffAmount = areaDiff * room.price;
        saleForm.setFieldsValue({
          areaDiffAmount: areaDiffAmount,
        });
      }
    }
  };

  // 计算折扣后的成交价
  const calculateTotalPrice = (originalPrice: number, discountType: string, discountValue: number, area: number) => {
    let finalPrice = originalPrice;
    if (discountType === 'amount') {
      // 总价减金额
      finalPrice = originalPrice - discountValue;
    } else if (discountType === 'rate') {
      // 折扣率 (如 95 表示 95折)
      finalPrice = originalPrice * (discountValue / 100);
    } else if (discountType === 'unit') {
      // 单价折扣 (每平米减多少)
      finalPrice = originalPrice - (discountValue * area);
    }
    return Math.round(finalPrice);
  };

  const handleDiscountChange = (values: any) => {
    const originalPrice = values.originalPrice || selectedRoom?.totalPrice || 0;
    const discountType = values.discountType;
    const discountValue = values.discountValue || 0;
    const predictArea = values.predictArea || selectedRoom?.predictArea || selectedRoom?.area || 0;

    // 计算折扣后的价格
    const finalPrice = calculateTotalPrice(originalPrice, discountType, discountValue, predictArea);

    // 如果有实测面积和面积差金额，需要加上面积差金额
    const areaDiffAmount = values.areaDiffAmount || 0;
    const totalWithAreaDiff = finalPrice + areaDiffAmount;

    saleForm.setFieldsValue({ totalPrice: totalWithAreaDiff });
  };

  // 处理实测面积变化
  const handleActualAreaChange = (actualArea: number | null) => {
    const predictArea = saleForm.getFieldValue('predictArea') || selectedRoom?.predictArea || selectedRoom?.area || 0;
    const originalPrice = saleForm.getFieldValue('originalPrice') || selectedRoom?.totalPrice || 0;
    const discountType = saleForm.getFieldValue('discountType');
    const discountValue = saleForm.getFieldValue('discountValue') || 0;
    const unitPrice = selectedRoom?.price || 0;

    if (actualArea) {
      const areaDiff = actualArea - predictArea;
      const areaDiffAmount = areaDiff * unitPrice;
      saleForm.setFieldsValue({
        areaDiff: areaDiff,
        areaDiffAmount: areaDiffAmount,
      });

      // 重新计算总价 = 折扣后价格 + 面积差金额
      const finalPrice = calculateTotalPrice(originalPrice, discountType, discountValue, predictArea);
      saleForm.setFieldsValue({ totalPrice: finalPrice + areaDiffAmount });
    } else {
      saleForm.setFieldsValue({
        areaDiff: null,
        areaDiffAmount: 0,
      });
    }
  };

  // 处理面积差金额手动调整
  const handleAreaDiffAmountChange = (areaDiffAmount: number | null) => {
    if (!areaDiffAmount) areaDiffAmount = 0;
    const originalPrice = saleForm.getFieldValue('originalPrice') || selectedRoom?.totalPrice || 0;
    const discountType = saleForm.getFieldValue('discountType');
    const discountValue = saleForm.getFieldValue('discountValue') || 0;
    const predictArea = saleForm.getFieldValue('predictArea') || selectedRoom?.predictArea || selectedRoom?.area || 0;

    // 重新计算总价 = 折扣后价格 + 面积差金额
    const finalPrice = calculateTotalPrice(originalPrice, discountType, discountValue, predictArea);
    saleForm.setFieldsValue({ totalPrice: finalPrice + areaDiffAmount });
  };

  const customerOptions = customers.map((c: any) => ({
    label: `${c.name} (${c.phone})${c.level ? ' - ' + c.level : ''}`,
    value: c.id,
    customer: c,
  }));

  // 置业顾问选项
  const consultantOptions = consultants.map((u: any) => ({
    label: u.name,
    value: u.id,
  }));

  // 加载客户详情
  const loadCustomerDetail = async (customerId: string) => {
    try {
      const res = await customerApi.get(customerId);
      setSelectedCustomerDetail(res.data);
      setCustomerDetailVisible(true);
    } catch (error) {
      message.error('获取客户详情失败');
    }
  };

  // 客户选择变化时，显示顾问信息
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c: any) => c.id === customerId);
    if (customer) {
      // 查找销售类型的归属顾问
      const salesBelong = customer.customerBelongs?.find((b: any) => b.type === 'sales');
      const consultantId = salesBelong?.userId || customer.customerBelongs?.[0]?.userId;
      saleForm.setFieldsValue({ salesPersonId: consultantId });
    }
  };

  const statusColors: Record<number, string> = { 0: 'orange', 1: 'green', 2: 'red', 3: 'default', 4: 'volcano' };
  const statusText: Record<number, string> = { 0: '待付款', 1: '已付清', 2: '已取消', 3: '退房', 4: '挞定' };

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: 120,
    },
    {
      title: '房间',
      dataIndex: 'room',
      key: 'room',
      render: (room: any, record: any) => {
        const predictArea = record.predictArea || room?.predictArea || room?.area;
        const actualArea = record.actualArea || room?.actualArea;
        return (
          <div>
            <div>{room?.unit || '-'}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {actualArea ? `实测${actualArea}m²` : `预测${predictArea}m²`}
            </div>
          </div>
        );
      },
      width: 100,
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
      render: (customer: any, record: any) => (
        <a onClick={() => loadCustomerDetail(record.customerId)}>
          {customer?.name || '-'}
        </a>
      ),
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'customer',
      key: 'phone',
      render: (customer: any) => customer?.phone ? <PhoneLink phone={customer.phone} /> : '-',
      width: 120,
    },
    {
      title: '原价(元)',
      dataIndex: 'originalPrice',
      key: 'originalPrice',
      width: 100,
      render: (val: number, record: any) => {
        if (val) return val?.toLocaleString();
        // 如果没有原价，用成交价
        return record.totalPrice?.toLocaleString();
      },
    },
    {
      title: '成交价(元)',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 120,
      render: (val: number) => val?.toLocaleString() || '-',
    },
    {
      title: '折扣',
      key: 'discount',
      width: 100,
      render: (_: any, record: any) => {
        if (!record.discountType || record.discountType === 'none') return '-';
        if (record.discountType === 'amount') return `减¥${record.discountValue}`;
        if (record.discountType === 'rate') return `${record.discountValue}折`;
        if (record.discountType === 'unit') return `单价减¥${record.discountValue}/m²`;
        return '-';
      },
    },
    {
      title: '已付金额(元)',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 100,
      render: (val: number) => val?.toLocaleString() || '0',
    },
    {
      title: '面积差(元)',
      key: 'areaDiff',
      width: 100,
      render: (_: any, record: any) => {
        if (!record.areaDiffAmount || record.areaDiffAmount === 0) return '-';
        return <span style={{ color: '#ff4d4f' }}>{record.areaDiffAmount?.toLocaleString()}</span>;
      },
    },
    {
      title: '签约日期',
      dataIndex: 'signDate',
      key: 'signDate',
      width: 100,
      render: (date: string) => date?.split('T')[0] || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => <Tag color={statusColors[status]}>{statusText[status]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => {
        // 已退房和挞定的记录不允许操作
        const canOperate = record.status !== 3 && record.status !== 4;

        const items = [
          { key: 'view', label: '查看详情', icon: <EyeOutlined /> },
          { key: 'edit', label: '编辑信息', icon: <EditOutlined /> },
          { type: 'divider' as const },
          { key: 'changeRoom', label: '换房', icon: <SwapOutlined />, disabled: !canOperate },
          { key: 'modify', label: '改签', icon: <FileTextOutlined />, disabled: !canOperate },
          { key: 'refund', label: '退房', icon: <RollbackOutlined />, danger: true, disabled: !canOperate },
          { key: 'forfeit', label: '挞定', icon: <ExclamationCircleOutlined />, danger: true, disabled: !canOperate },
          { type: 'divider' as const },
          { key: 'rename', label: '更名', icon: <EditOutlined />, disabled: !canOperate },
          { key: 'beneficiary', label: '权益人', icon: <UserOutlined /> },
        ];

        const handleMenuClick = (e: { key: string }) => {
          switch (e.key) {
            case 'view':
              handleView(record);
              break;
            case 'edit':
              handleEdit(record);
              break;
            case 'changeRoom':
              handleOpenChangeRoom(record);
              break;
            case 'modify':
              handleOpenModify(record);
              break;
            case 'refund':
              handleOpenRefund(record);
              break;
            case 'forfeit':
              handleOpenForfeit(record);
              break;
            case 'rename':
              handleOpenRename(record);
              break;
            case 'beneficiary':
              handleOpenBeneficiary(record);
              break;
          }
        };

        return (
          <Space>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
            <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']}>
              <Button type="link" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  // 可售房间（状态为0的）
  const availableRooms = rooms.filter((r: any) => r.status === 0);

  // 换房相关
  const handleOpenChangeRoom = async (record: any) => {
    setSelectedRecord(record);
    // 加载可售房间列表
    try {
      const res = await projApi.listRooms({ complexId: record.room?.building?.complexId, limit: 500, status: 0 });
      setChangeRoomList(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
    changeRoomForm.resetFields();
    setChangeRoomModalVisible(true);
  };

  const handleChangeRoom = async () => {
    try {
      const values = await changeRoomForm.validateFields();
      await transactionApi.changeRoom(selectedRecord.id, { newRoomId: values.newRoomId });
      message.success('换房成功');
      setChangeRoomModalVisible(false);
      loadSales();
      loadRooms(selectedComplex);
    } catch (error: any) {
      message.error(error.message || '换房失败');
    }
  };

  // 改签相关
  const handleOpenModify = (record: any) => {
    setSelectedRecord(record);
    modifyForm.setFieldsValue({
      ...record,
      signDate: record.signDate ? dayjs(record.signDate) : null,
      draftSignDate: record.draftSignDate ? dayjs(record.draftSignDate) : null,
      onlineSignDate: record.onlineSignDate ? dayjs(record.onlineSignDate) : null,
      discountType: record.discountType || 'none',
    });
    setModifyModalVisible(true);
  };

  const handleModify = async () => {
    try {
      const values = await modifyForm.validateFields();
      await transactionApi.modifyTransaction(selectedRecord.id, {
        ...values,
        signDate: values.signDate?.format('YYYY-MM-DD'),
        draftSignDate: values.draftSignDate?.format('YYYY-MM-DD'),
        onlineSignDate: values.onlineSignDate?.format('YYYY-MM-DD'),
        predictArea: values.predictArea,
        actualArea: values.actualArea,
        areaDiffAmount: values.areaDiffAmount || 0,
      });
      message.success('改签成功');
      setModifyModalVisible(false);
      loadSales();
    } catch (error: any) {
      message.error(error.message || '改签失败');
    }
  };

  // 退房相关
  const handleOpenRefund = (record: any) => {
    setSelectedRecord(record);
    refundForm.resetFields();
    setRefundModalVisible(true);
  };

  const handleRefund = async () => {
    try {
      const values = await refundForm.validateFields();
      await transactionApi.refundTransaction(selectedRecord.id, {
        refundAmount: values.refundAmount || 0,
        reason: values.reason,
      });
      message.success('退房成功');
      setRefundModalVisible(false);
      loadSales();
      loadRooms(selectedComplex);
    } catch (error: any) {
      message.error(error.message || '退房失败');
    }
  };

  // 挞定相关
  const handleOpenForfeit = (record: any) => {
    setSelectedRecord(record);
    forfeitForm.resetFields();
    setForfeitModalVisible(true);
  };

  const handleForfeit = async () => {
    try {
      const values = await forfeitForm.validateFields();
      await transactionApi.forfeitTransaction(selectedRecord.id, {
        forfeitAmount: values.forfeitAmount || 0,
        reason: values.reason,
      });
      message.success('挞定成功');
      setForfeitModalVisible(false);
      loadSales();
      loadRooms(selectedComplex);
    } catch (error: any) {
      message.error(error.message || '挞定失败');
    }
  };

  // 更名相关
  const handleOpenRename = (record: any) => {
    setSelectedRecord(record);
    renameForm.setFieldsValue({
      originalCustomerName: record.customer?.name,
    });
    setRenameModalVisible(true);
  };

  const handleRename = async () => {
    try {
      const values = await renameForm.validateFields();
      await transactionApi.rename(selectedRecord.id, {
        originalCustomerName: values.originalCustomerName,
        renameReason: values.renameReason,
      });
      message.success('更名成功');
      setRenameModalVisible(false);
      loadSales();
    } catch (error: any) {
      message.error(error.message || '更名失败');
    }
  };

  // 权益人相关
  const handleOpenBeneficiary = (record: any) => {
    setSelectedRecord(record);
    setEditingBeneficiary(null);
    beneficiaryForm.resetFields();
    setBeneficiaryModalVisible(true);
  };

  const handleAddBeneficiary = async () => {
    try {
      const values = await beneficiaryForm.validateFields();
      if (editingBeneficiary) {
        await transactionApi.updateBeneficiary(selectedRecord.id, editingBeneficiary.id, values);
        message.success('权益人更新成功');
      } else {
        await transactionApi.addBeneficiary(selectedRecord.id, values);
        message.success('权益人添加成功');
      }
      setBeneficiaryModalVisible(false);
      loadSales();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleEditBeneficiary = (beneficiary: any) => {
    setEditingBeneficiary(beneficiary);
    beneficiaryForm.setFieldsValue(beneficiary);
    setBeneficiaryModalVisible(true);
  };

  const handleDeleteBeneficiary = async (beneficiaryId: string) => {
    try {
      await transactionApi.deleteBeneficiary(selectedRecord.id, beneficiaryId);
      message.success('权益人删除成功');
      loadSales();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>销售录入</h2>
        <Space>
          <Select
            style={{ width: 180 }}
            placeholder="选择楼盘"
            value={selectedComplex}
            onChange={setSelectedComplex}
            options={complexes.map(c => ({ label: c.name, value: c.id }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={availableRooms.length === 0}>
            新增成交
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="成交套数" value={stats.count} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="成交总额" value={stats.totalAmount} precision={0} prefix="¥" valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="可售房源" value={availableRooms.length} /></Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          total: pagination.total,
          pageSize: pagination.limit,
          onChange: loadSales,
        }}
        scroll={{ x: 1200 }}
      />

      {/* 新增/编辑成交弹窗 */}
      <Modal
        title={editId ? '编辑成交' : '新增成交'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={saleForm} layout="vertical" onValuesChange={handleDiscountChange}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contractNo" label="合同编号" rules={[{ required: true }]}>
                <Input placeholder="系统自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roomId" label="选择房源" rules={[{ required: true }]}>
                <Select
                  placeholder="选择房间"
                  options={roomOptions}
                  showSearch
                  optionFilterProp="label"
                  disabled={!!editId}
                  onChange={handleRoomChange}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 房源原价显示 */}
          {selectedRoom && (
            <div style={{ background: '#f5f5f5', padding: 12, marginBottom: 16, borderRadius: 4 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ color: '#666' }}>房号: <strong>{selectedRoom.unit}</strong></div>
                </Col>
                <Col span={6}>
                  <div style={{ color: '#666' }}>预测面积: <strong>{selectedRoom.predictArea || selectedRoom.area}㎡</strong></div>
                </Col>
                {selectedRoom.actualArea && (
                  <Col span={6}>
                    <div style={{ color: '#666' }}>实测面积: <strong>{selectedRoom.actualArea}㎡</strong></div>
                  </Col>
                )}
                <Col span={6}>
                  <div style={{ color: '#666' }}>单价: <strong>¥{selectedRoom.price}/㎡</strong></div>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={6}>
                  <div style={{ color: '#666' }}>原价: <strong style={{ color: '#ff4d4f' }}>¥{selectedRoom.totalPrice?.toLocaleString()}</strong></div>
                </Col>
              </Row>
            </div>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerId" label="客户" rules={[{ required: true }]}>
                <Select
                  placeholder="选择客户"
                  options={customerOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={handleCustomerChange}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ padding: '8px', borderTop: '1px solid #d9d9d9', textAlign: 'center' }}>
                        <Button type="link" size="small" onClick={() => {
                          const customerId = saleForm.getFieldValue('customerId');
                          if (customerId) {
                            loadCustomerDetail(customerId);
                          } else {
                            message.info('请先选择一个客户');
                          }
                        }}>
                          查看客户详情
                        </Button>
                      </div>
                    </>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="salesPersonId" label="置业顾问" rules={[{ required: true }]}>
                <Select
                  placeholder="选择置业顾问"
                  options={consultantOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 折扣部分 */}
          <div style={{ background: '#e6f7ff', padding: 12, marginBottom: 16, borderRadius: 4, border: '1px solid #91d5ff' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 12 }}>折扣设置</div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="discountType" label="折扣类型" initialValue="none">
                  <Select
                    options={[
                      { label: '无折扣', value: 'none' },
                      { label: '总价减金额', value: 'amount' },
                      { label: '折扣率', value: 'rate' },
                      { label: '单价减', value: 'unit' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="discountValue" label="折扣值">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder={saleForm.getFieldValue('discountType') === 'rate' ? '如: 95' : '如: 50000'}
                    addonAfter={saleForm.getFieldValue('discountType') === 'rate' ? '折' : '元'}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="originalPrice" label="原价(元)">
                  <InputNumber style={{ width: '100%' }} disabled />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 面积部分 */}
          <div style={{ background: '#fff7e6', padding: 12, marginBottom: 16, borderRadius: 4, border: '1px solid #ffd591' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 12 }}>面积设置</div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="predictArea" label="预测面积(㎡)">
                  <InputNumber style={{ width: '100%' }} placeholder="预测面积" disabled={!!editId} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="actualArea" label="实测面积(㎡)">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="实测面积"
                    onChange={handleActualAreaChange}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="areaDiff" label="面积差(㎡)">
                  <InputNumber style={{ width: '100%' }} placeholder="实测-预测" disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="areaDiffAmount" label="面积差金额(元)">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="面积差金额"
                    onChange={handleAreaDiffAmountChange}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="totalPrice" label="成交总价(元)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="自动计算或手动输入" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paidAmount" label="已付金额(元)">
                <InputNumber style={{ width: '100%' }} placeholder="如: 500000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="draftSignDate" label="草签日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="onlineSignDate" label="网签日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态">
                <Select
                  options={[
                    { label: '待付款', value: 0 },
                    { label: '已付清', value: 1 },
                    { label: '已取消', value: 2 },
                    { label: '退房', value: 3 },
                    { label: '挞定', value: 4 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情弹窗 */}
      <Modal
        title="成交详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>关闭</Button>
        ]}
        width={600}
      >
        {selectedRecord && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>合同编号:</strong> {selectedRecord.contractNo}</div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>状态:</strong> <Tag color={statusColors[selectedRecord.status]}>{statusText[selectedRecord.status]}</Tag></div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>房间:</strong> {selectedRecord.room?.unit}</div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <strong>面积:</strong>{' '}
                  预测{(selectedRecord.predictArea || selectedRecord.room?.predictArea || selectedRecord.room?.area)}m²
                  {selectedRecord.actualArea && (
                    <> / 实测{selectedRecord.actualArea}m²</>
                  )}
                </div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>客户:</strong> {selectedRecord.customer?.name}</div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>电话:</strong> <PhoneLink phone={selectedRecord.customer?.phone} /></div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>原价:</strong> ¥{selectedRecord.originalPrice?.toLocaleString() || selectedRecord.totalPrice?.toLocaleString()}</div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>成交价:</strong> <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{selectedRecord.totalPrice?.toLocaleString()}</span></div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <strong>折扣:</strong>{' '}
                  {selectedRecord.discountType === 'amount' && `减¥${selectedRecord.discountValue}`}
                  {selectedRecord.discountType === 'rate' && `${selectedRecord.discountValue}折`}
                  {selectedRecord.discountType === 'unit' && `单价减¥${selectedRecord.discountValue}/m²`}
                  {(!selectedRecord.discountType || selectedRecord.discountType === 'none') && '无折扣'}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>已付:</strong> ¥{selectedRecord.paidAmount?.toLocaleString()}</div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ marginBottom: 12 }}>
                  <strong>签约日期:</strong> {selectedRecord.signDate?.split('T')[0]}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 12 }}>
                  <strong>草签:</strong> {selectedRecord.draftSignDate?.split('T')[0] || '-'}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 12 }}>
                  <strong>网签:</strong> {selectedRecord.onlineSignDate?.split('T')[0] || '-'}
                </div>
              </Col>
            </Row>
            {selectedRecord.areaDiffAmount > 0 && (
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 12 }}>
                    <strong>面积差:</strong> {selectedRecord.areaDiff || (selectedRecord.actualArea - selectedRecord.predictArea)}m²
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 12, color: '#ff4d4f' }}>
                    <strong>面积差金额:</strong> ¥{selectedRecord.areaDiffAmount?.toLocaleString()}
                  </div>
                </Col>
              </Row>
            )}
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}><strong>创建时间:</strong> {selectedRecord.createdAt?.split('T')[0]}</div>
              </Col>
            </Row>
            {selectedRecord.type && selectedRecord.type !== 'normal' && (
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 12 }}>
                    <strong>业务类型:</strong>{' '}
                    <Tag color="blue">
                      {selectedRecord.type === 'change_room' && '换房'}
                      {selectedRecord.type === 'modify' && '改签'}
                      {selectedRecord.type === 'refund' && '退房'}
                      {selectedRecord.type === 'forfeit' && '挞定'}
                    </Tag>
                  </div>
                </Col>
                {selectedRecord.operateDate && (
                  <Col span={12}>
                    <div style={{ marginBottom: 12 }}><strong>操作日期:</strong> {selectedRecord.operateDate?.split('T')[0]}</div>
                  </Col>
                )}
              </Row>
            )}
            {(selectedRecord.refundAmount || selectedRecord.forfeitAmount) && (
              <Row gutter={16}>
                {selectedRecord.refundAmount > 0 && (
                  <Col span={12}>
                    <div style={{ marginBottom: 12 }}><strong>退还金额:</strong> ¥{selectedRecord.refundAmount?.toLocaleString()}</div>
                  </Col>
                )}
                {selectedRecord.forfeitAmount > 0 && (
                  <Col span={12}>
                    <div style={{ marginBottom: 12 }}><strong>没收金额:</strong> ¥{selectedRecord.forfeitAmount?.toLocaleString()}</div>
                  </Col>
                )}
              </Row>
            )}
            {selectedRecord.reason && (
              <div style={{ marginBottom: 12 }}>
                <strong>原因:</strong> {selectedRecord.reason}
              </div>
            )}
            {selectedRecord.remark && (
              <div style={{ marginBottom: 12 }}><strong>备注:</strong> {selectedRecord.remark}</div>
            )}
          </div>
        )}
      </Modal>

      {/* 客户详情弹窗 */}
      <Modal
        title="客户详情"
        open={customerDetailVisible}
        onCancel={() => setCustomerDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCustomerDetailVisible(false)}>关闭</Button>
        ]}
        width={600}
      >
        {selectedCustomerDetail && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="姓名">{selectedCustomerDetail.name}</Descriptions.Item>
            <Descriptions.Item label="电话"><PhoneLink phone={selectedCustomerDetail.phone} /></Descriptions.Item>
            <Descriptions.Item label="微信">{selectedCustomerDetail.wechat || '-'}</Descriptions.Item>
            <Descriptions.Item label="身份证号">{selectedCustomerDetail.idCard || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户等级">
              {selectedCustomerDetail.level ? (
                <Tag color={selectedCustomerDetail.level === 'A类' ? 'red' : selectedCustomerDetail.level === 'B类' ? 'orange' : 'blue'}>
                  {selectedCustomerDetail.level}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedCustomerDetail.status === 0 ? 'default' : selectedCustomerDetail.status === 1 ? 'processing' : 'success'}>
                {selectedCustomerDetail.status === 0 ? '潜在' : selectedCustomerDetail.status === 1 ? '意向' : '成交'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="来源">{selectedCustomerDetail.source || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{selectedCustomerDetail.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="跟进人" span={2}>
              {selectedCustomerDetail.customerBelongs?.length > 0 ? (
                selectedCustomerDetail.customerBelongs.map((belong: any) => (
                  <Tag key={belong.id} icon={<UserOutlined />}>{belong.user?.name || '未知'}</Tag>
                ))
              ) : '公共池'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 换房弹窗 */}
      <Modal
        title="换房"
        open={changeRoomModalVisible}
        onOk={handleChangeRoom}
        onCancel={() => setChangeRoomModalVisible(false)}
        width={500}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div>原房间: <strong>{selectedRecord.room?.unit}</strong></div>
                </Col>
                <Col span={12}>
                  <div>客户: <strong>{selectedRecord.customer?.name}</strong></div>
                </Col>
              </Row>
            </div>
            <Form form={changeRoomForm} layout="vertical">
              <Form.Item name="newRoomId" label="选择新房间" rules={[{ required: true, message: '请选择新房间' }]}>
                <Select
                  placeholder="选择新房间"
                  showSearch
                  optionFilterProp="label"
                >
                  {changeRoomList.map((r: any) => (
                    <Select.Option key={r.id} value={r.id} label={`${r.unit} (${r.area}m² / ${r.totalPrice}元)`}>
                      <div>{r.unit} - {r.area}m² - ¥{r.totalPrice?.toLocaleString()}</div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 改签弹窗 */}
      <Modal
        title="改签"
        open={modifyModalVisible}
        onOk={handleModify}
        onCancel={() => setModifyModalVisible(false)}
        width={600}
      >
        <Form form={modifyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="originalPrice" label="原价(元)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountType" label="折扣类型">
                <Select options={[
                  { label: '无折扣', value: 'none' },
                  { label: '总价减金额', value: 'amount' },
                  { label: '折扣率', value: 'rate' },
                  { label: '单价减', value: 'unit' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discountValue" label="折扣值">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="totalPrice" label="成交总价(元)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="draftSignDate" label="草签日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="onlineSignDate" label="网签日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态">
                <Select options={[
                  { label: '待付款', value: 0 },
                  { label: '已付清', value: 1 },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="predictArea" label="预测面积(㎡)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualArea" label="实测面积(㎡)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="areaDiffAmount" label="面积差金额(元)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 退房弹窗 */}
      <Modal
        title="退房"
        open={refundModalVisible}
        onOk={handleRefund}
        onCancel={() => setRefundModalVisible(false)}
        width={500}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div>房间: <strong>{selectedRecord.room?.unit}</strong></div>
                </Col>
                <Col span={12}>
                  <div>客户: <strong>{selectedRecord.customer?.name}</strong></div>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <div>成交价: <strong>¥{selectedRecord.totalPrice?.toLocaleString()}</strong></div>
                </Col>
                <Col span={12}>
                  <div>已付: <strong>¥{selectedRecord.paidAmount?.toLocaleString()}</strong></div>
                </Col>
              </Row>
            </div>
            <Form form={refundForm} layout="vertical">
              <Form.Item name="refundAmount" label="退还金额(元)">
                <InputNumber style={{ width: '100%' }} placeholder="输入退还给客户的金额" />
              </Form.Item>
              <Form.Item name="reason" label="退房原因">
                <Input.TextArea rows={3} placeholder="请输入退房原因" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 挞定弹窗 */}
      <Modal
        title="挞定"
        open={forfeitModalVisible}
        onOk={handleForfeit}
        onCancel={() => setForfeitModalVisible(false)}
        width={500}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div>房间: <strong>{selectedRecord.room?.unit}</strong></div>
                </Col>
                <Col span={12}>
                  <div>客户: <strong>{selectedRecord.customer?.name}</strong></div>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <div>成交价: <strong>¥{selectedRecord.totalPrice?.toLocaleString()}</strong></div>
                </Col>
                <Col span={12}>
                  <div>已付: <strong>¥{selectedRecord.paidAmount?.toLocaleString()}</strong></div>
                </Col>
              </Row>
            </div>
            <Form form={forfeitForm} layout="vertical">
              <Form.Item name="forfeitAmount" label="没收金额(元)">
                <InputNumber style={{ width: '100%' }} placeholder="输入没收的定金金额" />
              </Form.Item>
              <Form.Item name="reason" label="挞定原因">
                <Input.TextArea rows={3} placeholder="请输入挞定原因" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 更名弹窗 */}
      <Modal
        title="更名"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => setRenameModalVisible(false)}
        width={500}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div>房间: <strong>{selectedRecord.room?.unit}</strong></div>
                </Col>
                <Col span={12}>
                  <div>客户: <strong>{selectedRecord.customer?.name}</strong></div>
                </Col>
              </Row>
            </div>
            <Form form={renameForm} layout="vertical">
              <Form.Item name="originalCustomerName" label="原客户姓名" rules={[{ required: true, message: '请输入原客户姓名' }]}>
                <Input placeholder="请输入更名前的客户姓名" />
              </Form.Item>
              <Form.Item name="renameReason" label="更名原因">
                <Input.TextArea rows={3} placeholder="请输入更名原因" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 权益人管理弹窗 */}
      <Modal
        title="权益人管理"
        open={beneficiaryModalVisible}
        onCancel={() => { setBeneficiaryModalVisible(false); setEditingBeneficiary(null); }}
        footer={null}
        width={700}
      >
        {selectedRecord && (
          <div>
            {/* 权益人列表 */}
            {selectedRecord.beneficiaries && selectedRecord.beneficiaries.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4>已添加权益人</h4>
                <Table
                  dataSource={selectedRecord.beneficiaries}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '姓名', dataIndex: 'name', key: 'name' },
                    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
                    { title: '关系', dataIndex: 'relation', key: 'relation' },
                    { title: '产权比例', dataIndex: 'shareRatio', key: 'shareRatio', render: (val) => val ? `${val}%` : '-' },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_: any, record: any) => (
                        <Space>
                          <Button type="link" size="small" onClick={() => handleEditBeneficiary(record)}>编辑</Button>
                          <Button type="link" size="small" danger onClick={() => handleDeleteBeneficiary(record.id)}>删除</Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* 添加/编辑权益人表单 */}
            <Divider>{editingBeneficiary ? '编辑权益人' : '添加权益人'}</Divider>
            <Form form={beneficiaryForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                    <Input placeholder="请输入权益人姓名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="联系电话">
                    <Input placeholder="请输入联系电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="relation" label="与主客户关系">
                    <Select placeholder="选择关系" options={[
                      { label: '配偶', value: '配偶' },
                      { label: '父母', value: '父母' },
                      { label: '子女', value: '子女' },
                      { label: '其他', value: '其他' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="shareRatio" label="产权比例(%)">
                    <InputNumber style={{ width: '100%' }} placeholder="如: 50" min={0} max={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item>
                <Button type="primary" onClick={handleAddBeneficiary}>
                  {editingBeneficiary ? '更新权益人' : '添加权益人'}
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OfficeSales;
