import { useEffect, useState } from 'react';
import type { Key } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
} from 'antd';
import {
  AlipayOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  MoneyCollectOutlined,
  PlusOutlined,
  SearchOutlined,
  SwapOutlined,
  TransactionOutlined,
  WalletOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { financeApi, projectApi } from '../../services/api';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

type DateRangeFilter = {
  startDate?: string;
  endDate?: string;
};

type LedgerFilters = DateRangeFilter & {
  complexId?: string;
  status?: number;
  keyword?: string;
};

type CashFlowFilters = DateRangeFilter & {
  complexId?: string;
  direction?: 'in' | 'out';
  category?: string;
  keyword?: string;
};

type PayableFilters = {
  complexId?: string;
  sourceType?: 'commission' | 'withdrawal';
  status?: number;
  keyword?: string;
};

type ReceivableFilters = {
  complexId?: string;
  agingBucket?: string;
  status?: number;
  keyword?: string;
};

type PaymentQueueFilters = DateRangeFilter & {
  complexId?: string;
  status?: number;
  type?: string;
  keyword?: string;
};

type ReconciliationFilters = DateRangeFilter & {
  complexId?: string;
};

const emptyLedgerFilters: LedgerFilters = {};
const emptyCashFlowFilters: CashFlowFilters = {};
const emptyPayableFilters: PayableFilters = {};
const emptyReceivableFilters: ReceivableFilters = {};
const emptyPaymentQueueFilters: PaymentQueueFilters = {};
const emptyReconciliationFilters: ReconciliationFilters = {};

const money = (value?: number) => `¥${(value || 0).toLocaleString()}`;
const moneySigned = (value?: number, direction?: string) => {
  const amount = money(value);
  if (direction === 'out') return `-${amount}`;
  if (direction === 'in') return `+${amount}`;
  return amount;
};

const isApprovalResponse = (data: any) => Boolean(data?.approvalRequired || data?.request);

const approvalMessage = (data: any, fallback: string) => (
  isApprovalResponse(data) ? data.message || '已提交审批，通过后系统会自动执行' : fallback
);

const Finance = () => {
  const [activeTab, setActiveTab] = useState('ledger');
  const [complexes, setComplexes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerPagination, setLedgerPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [ledgerFilters, setLedgerFilters] = useState<LedgerFilters>(emptyLedgerFilters);

  const [cashFlowLoading, setCashFlowLoading] = useState(false);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [cashFlowPagination, setCashFlowPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [cashFlowFilters, setCashFlowFilters] = useState<CashFlowFilters>(emptyCashFlowFilters);

  const [payableLoading, setPayableLoading] = useState(false);
  const [payableData, setPayableData] = useState<any[]>([]);
  const [payablePagination, setPayablePagination] = useState({ page: 1, limit: 10, total: 0 });
  const [payableFilters, setPayableFilters] = useState<PayableFilters>(emptyPayableFilters);
  const [selectedPayableRowKeys, setSelectedPayableRowKeys] = useState<Key[]>([]);
  const [selectedPayableRows, setSelectedPayableRows] = useState<any[]>([]);

  const [receivableLoading, setReceivableLoading] = useState(false);
  const [receivableData, setReceivableData] = useState<any[]>([]);
  const [receivablePagination, setReceivablePagination] = useState({ page: 1, limit: 10, total: 0 });
  const [receivableFilters, setReceivableFilters] = useState<ReceivableFilters>(emptyReceivableFilters);

  const [paymentQueueLoading, setPaymentQueueLoading] = useState(false);
  const [paymentQueueData, setPaymentQueueData] = useState<any[]>([]);
  const [paymentQueuePagination, setPaymentQueuePagination] = useState({ page: 1, limit: 10, total: 0 });
  const [paymentQueueFilters, setPaymentQueueFilters] = useState<PaymentQueueFilters>(emptyPaymentQueueFilters);
  const [selectedPaymentRowKeys, setSelectedPaymentRowKeys] = useState<Key[]>([]);

  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<any>({});
  const [reconciliationFilters, setReconciliationFilters] = useState<ReconciliationFilters>(emptyReconciliationFilters);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [priceChangeModalVisible, setPriceChangeModalVisible] = useState(false);
  const [paymentForm] = Form.useForm();
  const [priceChangeForm] = Form.useForm();
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  useEffect(() => {
    loadComplexes();
    loadStats();
    loadLedger();
    loadCashFlow();
    loadPayables();
    loadReceivables();
    loadPaymentQueue();
    loadReconciliation();
  }, []);

  const statusOptions = [
    { label: '待付款', value: 0, color: 'orange' },
    { label: '已付清', value: 1, color: 'green' },
    { label: '已取消', value: 2, color: 'red' },
    { label: '退房', value: 3, color: 'purple' },
    { label: '挞定', value: 4, color: 'magenta' },
  ];

  const paymentTypeOptions = [
    { label: '定金', value: 'deposit' },
    { label: '首付', value: 'down_payment' },
    { label: '按揭', value: 'mortgage' },
    { label: '尾款', value: 'final_payment' },
    { label: '其他', value: 'other' },
  ];

  const paymentMethodOptions = [
    { label: '银行转账', value: 'bank_transfer', icon: <BankOutlined /> },
    { label: '现金', value: 'cash', icon: <MoneyCollectOutlined /> },
    { label: '微信', value: 'wechat', icon: <WechatOutlined /> },
    { label: '支付宝', value: 'alipay', icon: <AlipayOutlined /> },
    { label: '支票', value: 'check' },
  ];

  const payableStatusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'orange', text: '待审核' },
    1: { color: 'blue', text: '待付款' },
    2: { color: 'green', text: '已付款' },
    3: { color: 'red', text: '已拒绝' },
  };

  const loadComplexes = async () => {
    try {
      const res = await projectApi.listComplex({ limit: 100 });
      setComplexes(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadStats = async (nextFilters: LedgerFilters = ledgerFilters) => {
    try {
      const res = await financeApi.getStats({
        complexId: nextFilters.complexId,
        startDate: nextFilters.startDate,
        endDate: nextFilters.endDate,
      });
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadLedger = async (
    page = ledgerPagination.page,
    limit = ledgerPagination.limit,
    nextFilters: LedgerFilters = ledgerFilters,
  ) => {
    setLedgerLoading(true);
    try {
      const res = await financeApi.getList({ page, limit, ...nextFilters });
      setLedgerData(res.data.data || []);
      setLedgerPagination({ page, limit, total: res.data.total || 0 });
    } catch (error) {
      console.error(error);
      message.error('加载收款台账失败');
    } finally {
      setLedgerLoading(false);
    }
  };

  const loadCashFlow = async (
    page = cashFlowPagination.page,
    limit = cashFlowPagination.limit,
    nextFilters: CashFlowFilters = cashFlowFilters,
  ) => {
    setCashFlowLoading(true);
    try {
      const res = await financeApi.getCashFlow({ page, limit, ...nextFilters });
      setCashFlowData(res.data.data || []);
      setCashFlowPagination({ page, limit, total: res.data.total || 0 });
    } catch (error) {
      console.error(error);
      message.error('加载资金流水失败');
    } finally {
      setCashFlowLoading(false);
    }
  };

  const loadPayables = async (
    page = payablePagination.page,
    limit = payablePagination.limit,
    nextFilters: PayableFilters = payableFilters,
  ) => {
    setPayableLoading(true);
    try {
      const res = await financeApi.getPayables({ page, limit, ...nextFilters });
      setPayableData(res.data.data || []);
      setPayablePagination({ page, limit, total: res.data.total || 0 });
    } catch (error) {
      console.error(error);
      message.error('加载待付款项失败');
    } finally {
      setPayableLoading(false);
    }
  };

  const loadReceivables = async (
    page = receivablePagination.page,
    limit = receivablePagination.limit,
    nextFilters: ReceivableFilters = receivableFilters,
  ) => {
    setReceivableLoading(true);
    try {
      const res = await financeApi.getReceivables({ page, limit, ...nextFilters });
      setReceivableData(res.data.data || []);
      setReceivablePagination({ page, limit, total: res.data.total || 0 });
    } catch (error) {
      console.error(error);
      message.error('加载应收催款失败');
    } finally {
      setReceivableLoading(false);
    }
  };

  const loadPaymentQueue = async (
    page = paymentQueuePagination.page,
    limit = paymentQueuePagination.limit,
    nextFilters: PaymentQueueFilters = paymentQueueFilters,
  ) => {
    setPaymentQueueLoading(true);
    try {
      const res = await financeApi.getPaymentQueue({ page, limit, ...nextFilters });
      setPaymentQueueData(res.data.data || []);
      setPaymentQueuePagination({ page, limit, total: res.data.total || 0 });
    } catch (error) {
      console.error(error);
      message.error('加载收款确认失败');
    } finally {
      setPaymentQueueLoading(false);
    }
  };

  const loadReconciliation = async (nextFilters: ReconciliationFilters = reconciliationFilters) => {
    setReconciliationLoading(true);
    try {
      const res = await financeApi.getReconciliation(nextFilters);
      setReconciliationData(res.data || {});
    } catch (error) {
      console.error(error);
      message.error('加载对账汇总失败');
    } finally {
      setReconciliationLoading(false);
    }
  };

  const refreshFinanceData = async () => {
    await Promise.all([
      loadStats(),
      loadLedger(),
      loadCashFlow(),
      loadPayables(),
      loadReceivables(),
      loadPaymentQueue(),
      loadReconciliation(),
    ]);
  };

  const handleLedgerSearch = () => {
    loadLedger(1, ledgerPagination.limit);
    loadStats(ledgerFilters);
  };

  const handleLedgerReset = () => {
    setLedgerFilters(emptyLedgerFilters);
    loadLedger(1, ledgerPagination.limit, emptyLedgerFilters);
    loadStats(emptyLedgerFilters);
  };

  const handleCashFlowSearch = () => {
    loadCashFlow(1, cashFlowPagination.limit);
  };

  const handleCashFlowReset = () => {
    setCashFlowFilters(emptyCashFlowFilters);
    loadCashFlow(1, cashFlowPagination.limit, emptyCashFlowFilters);
  };

  const handlePayableSearch = () => {
    loadPayables(1, payablePagination.limit);
  };

  const handlePayableReset = () => {
    setPayableFilters(emptyPayableFilters);
    loadPayables(1, payablePagination.limit, emptyPayableFilters);
  };

  const handleReceivableSearch = () => {
    loadReceivables(1, receivablePagination.limit);
  };

  const handleReceivableReset = () => {
    setReceivableFilters(emptyReceivableFilters);
    loadReceivables(1, receivablePagination.limit, emptyReceivableFilters);
  };

  const handlePaymentQueueSearch = () => {
    loadPaymentQueue(1, paymentQueuePagination.limit);
  };

  const handlePaymentQueueReset = () => {
    setPaymentQueueFilters(emptyPaymentQueueFilters);
    loadPaymentQueue(1, paymentQueuePagination.limit, emptyPaymentQueueFilters);
  };

  const handleReconciliationSearch = () => {
    loadReconciliation(reconciliationFilters);
  };

  const handleReconciliationReset = () => {
    setReconciliationFilters(emptyReconciliationFilters);
    loadReconciliation(emptyReconciliationFilters);
  };

  const handleViewDetail = async (record: any) => {
    setDetailVisible(true);
    setSelectedTransaction(record);
    try {
      const res = await financeApi.getSummary(record.id);
      setDetailData(res.data);
    } catch (error) {
      console.error(error);
      message.error('加载详情失败');
    }
  };

  const reloadDetail = async () => {
    if (!selectedTransaction?.id) return;
    const res = await financeApi.getSummary(selectedTransaction.id);
    setDetailData(res.data);
  };

  const handleAddPayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      const res = await financeApi.createPayment({
        ...values,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
      });
      message.success(approvalMessage(res.data, '收款登记成功'));
      setPaymentModalVisible(false);
      paymentForm.resetFields();
      await reloadDetail();
      await refreshFinanceData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || error.message || '添加失败');
    }
  };

  const handlePaymentStatus = async (id: string, status: number) => {
    try {
      const res = await financeApi.updatePaymentStatus(id, status);
      message.success(approvalMessage(res.data, status === 1 ? '付款已确认' : '状态已更新'));
      await reloadDetail();
      await refreshFinanceData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '操作失败');
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await financeApi.deletePayment(id);
      message.success('删除成功');
      await reloadDetail();
      await refreshFinanceData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || error.message || '删除失败');
    }
  };

  const getCurrentUnitPrice = () => {
    const totalPrice = detailData?.transaction?.totalPrice || 0;
    const area = detailData?.room?.area || selectedTransaction?.area || 0;
    if (area > 0) return Number((totalPrice / area).toFixed(2));
    return detailData?.room?.price || 0;
  };

  const handlePriceChange = async () => {
    try {
      const values = await priceChangeForm.validateFields();
      const oldUnitPrice = getCurrentUnitPrice();
      const res = await financeApi.createPriceChange({
        transactionId: selectedTransaction.id,
        changeType: values.changeType,
        oldPrice: oldUnitPrice,
        oldTotalPrice: detailData.transaction.totalPrice,
        newPrice: values.newPrice || oldUnitPrice,
        newTotalPrice: values.newTotalPrice,
        diffAmount: values.diffAmount,
        reason: values.reason,
        operator: values.operator,
      });
      message.success(approvalMessage(res.data, '价格变更成功'));
      setPriceChangeModalVisible(false);
      priceChangeForm.resetFields();
      await reloadDetail();
      setSelectedTransaction({ ...selectedTransaction, totalPrice: values.newTotalPrice });
      await refreshFinanceData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || error.message || '变更失败');
    }
  };

  const handlePayablePay = async (record: any) => {
    try {
      if (record.sourceType === 'commission') {
        const res = await financeApi.payCommission(record.sourceId);
        message.success(approvalMessage(res.data, '付款确认成功'));
      } else {
        const res = await financeApi.payWithdrawal(record.sourceId);
        message.success(approvalMessage(res.data, '付款确认成功'));
      }
      await refreshFinanceData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '付款失败');
    }
  };

  const handleBatchPay = async () => {
    const rows = selectedPayableRows.filter((row) => row.canPay);
    if (!rows.length) {
      message.warning('请选择待付款的记录');
      return;
    }

    try {
      const res = await financeApi.batchPayPayables(rows.map((row) => ({ sourceType: row.sourceType, id: row.sourceId })));
      message.success(approvalMessage(res.data, `已确认 ${rows.length} 笔付款`));
      setSelectedPayableRowKeys([]);
      setSelectedPayableRows([]);
      await refreshFinanceData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '批量付款失败');
    }
  };

  const handleBatchConfirmPayment = async (status: number) => {
    if (!selectedPaymentRowKeys.length) {
      message.warning('请选择收款记录');
      return;
    }

    try {
      const res = await financeApi.batchUpdatePaymentStatus(selectedPaymentRowKeys.map(String), status);
      message.success(approvalMessage(res.data, status === 1 ? '批量确认收款成功' : '批量状态更新成功'));
      setSelectedPaymentRowKeys([]);
      await refreshFinanceData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '批量操作失败');
    }
  };

  const renderLedgerFilters = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择楼盘"
            allowClear
            value={ledgerFilters.complexId}
            onChange={(value) => setLedgerFilters({ ...ledgerFilters, complexId: value })}
            options={complexes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="成交状态"
            allowClear
            value={ledgerFilters.status}
            onChange={(value) => setLedgerFilters({ ...ledgerFilters, status: value })}
            options={statusOptions.map(({ label, value }) => ({ label, value }))}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <RangePicker
            style={{ width: '100%' }}
            onChange={(_, dateStrings) => {
              setLedgerFilters({
                ...ledgerFilters,
                startDate: dateStrings[0] || undefined,
                endDate: dateStrings[1] || undefined,
              });
            }}
          />
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Input
            placeholder="合同号/客户/房号"
            prefix={<SearchOutlined />}
            value={ledgerFilters.keyword}
            onChange={(e) => setLedgerFilters({ ...ledgerFilters, keyword: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} md={10} xl={6}>
          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleLedgerSearch}>查询</Button>
            <Button icon={<EditOutlined />} onClick={handleLedgerReset}>重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderCashFlowFilters = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择楼盘"
            allowClear
            value={cashFlowFilters.complexId}
            onChange={(value) => setCashFlowFilters({ ...cashFlowFilters, complexId: value })}
            options={complexes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="收支方向"
            allowClear
            value={cashFlowFilters.direction}
            onChange={(value) => setCashFlowFilters({ ...cashFlowFilters, direction: value })}
            options={[
              { label: '收入', value: 'in' },
              { label: '支出', value: 'out' },
            ]}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="流水类型"
            allowClear
            value={cashFlowFilters.category}
            onChange={(value) => setCashFlowFilters({ ...cashFlowFilters, category: value })}
            options={[
              { label: '客户收款', value: '客户收款' },
              { label: '佣金发放', value: '佣金发放' },
              { label: '提现打款', value: '提现打款' },
            ]}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <RangePicker
            style={{ width: '100%' }}
            onChange={(_, dateStrings) => {
              setCashFlowFilters({
                ...cashFlowFilters,
                startDate: dateStrings[0] || undefined,
                endDate: dateStrings[1] || undefined,
              });
            }}
          />
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Input
            placeholder="合同/客户/经办人"
            prefix={<SearchOutlined />}
            value={cashFlowFilters.keyword}
            onChange={(e) => setCashFlowFilters({ ...cashFlowFilters, keyword: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} md={10} xl={2}>
          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleCashFlowSearch}>查询</Button>
            <Button onClick={handleCashFlowReset}>重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderPayableFilters = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择楼盘"
            allowClear
            value={payableFilters.complexId}
            onChange={(value) => setPayableFilters({ ...payableFilters, complexId: value })}
            options={complexes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="付款类型"
            allowClear
            value={payableFilters.sourceType}
            onChange={(value) => setPayableFilters({ ...payableFilters, sourceType: value })}
            options={[
              { label: '佣金', value: 'commission' },
              { label: '提现', value: 'withdrawal' },
            ]}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="付款状态"
            allowClear
            value={payableFilters.status}
            onChange={(value) => setPayableFilters({ ...payableFilters, status: value })}
            options={[
              { label: '待审核', value: 0 },
              { label: '待付款', value: 1 },
              { label: '已付款', value: 2 },
              { label: '已拒绝', value: 3 },
            ]}
          />
        </Col>
        <Col xs={24} md={8} xl={5}>
          <Input
            placeholder="合同/客户/收款方"
            prefix={<SearchOutlined />}
            value={payableFilters.keyword}
            onChange={(e) => setPayableFilters({ ...payableFilters, keyword: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} md={10} xl={7}>
          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handlePayableSearch}>查询</Button>
            <Button onClick={handlePayableReset}>重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderReceivableFilters = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择楼盘"
            allowClear
            value={receivableFilters.complexId}
            onChange={(value) => setReceivableFilters({ ...receivableFilters, complexId: value })}
            options={complexes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="账龄"
            allowClear
            value={receivableFilters.agingBucket}
            onChange={(value) => setReceivableFilters({ ...receivableFilters, agingBucket: value })}
            options={[
              { label: '未到期', value: 'not_due' },
              { label: '7天内到期', value: 'due_soon' },
              { label: '逾期1-30天', value: 'overdue_1_30' },
              { label: '逾期31-60天', value: 'overdue_31_60' },
              { label: '逾期60天以上', value: 'overdue_60' },
            ]}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="成交状态"
            allowClear
            value={receivableFilters.status}
            onChange={(value) => setReceivableFilters({ ...receivableFilters, status: value })}
            options={statusOptions.map(({ label, value }) => ({ label, value }))}
          />
        </Col>
        <Col xs={24} md={8} xl={5}>
          <Input
            placeholder="合同/客户/房号"
            prefix={<SearchOutlined />}
            value={receivableFilters.keyword}
            onChange={(e) => setReceivableFilters({ ...receivableFilters, keyword: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} md={10} xl={7}>
          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleReceivableSearch}>查询</Button>
            <Button onClick={handleReceivableReset}>重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderPaymentQueueFilters = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择楼盘"
            allowClear
            value={paymentQueueFilters.complexId}
            onChange={(value) => setPaymentQueueFilters({ ...paymentQueueFilters, complexId: value })}
            options={complexes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="确认状态"
            allowClear
            value={paymentQueueFilters.status}
            onChange={(value) => setPaymentQueueFilters({ ...paymentQueueFilters, status: value })}
            options={[
              { label: '待确认', value: 0 },
              { label: '已确认', value: 1 },
              { label: '已退款', value: 2 },
            ]}
          />
        </Col>
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="款项类型"
            allowClear
            value={paymentQueueFilters.type}
            onChange={(value) => setPaymentQueueFilters({ ...paymentQueueFilters, type: value })}
            options={paymentTypeOptions}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <RangePicker
            style={{ width: '100%' }}
            onChange={(_, dateStrings) => {
              setPaymentQueueFilters({
                ...paymentQueueFilters,
                startDate: dateStrings[0] || undefined,
                endDate: dateStrings[1] || undefined,
              });
            }}
          />
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Input
            placeholder="合同/客户/经办"
            prefix={<SearchOutlined />}
            value={paymentQueueFilters.keyword}
            onChange={(e) => setPaymentQueueFilters({ ...paymentQueueFilters, keyword: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} md={10} xl={2}>
          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handlePaymentQueueSearch}>查询</Button>
            <Button onClick={handlePaymentQueueReset}>重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderReconciliationFilters = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={6} xl={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择楼盘"
            allowClear
            value={reconciliationFilters.complexId}
            onChange={(value) => setReconciliationFilters({ ...reconciliationFilters, complexId: value })}
            options={complexes.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <RangePicker
            style={{ width: '100%' }}
            onChange={(_, dateStrings) => {
              setReconciliationFilters({
                ...reconciliationFilters,
                startDate: dateStrings[0] || undefined,
                endDate: dateStrings[1] || undefined,
              });
            }}
          />
        </Col>
        <Col xs={24} md={10} xl={8}>
          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleReconciliationSearch}>生成对账</Button>
            <Button onClick={handleReconciliationReset}>重置</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const ledgerColumns = [
    { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 150 },
    { title: '楼盘', dataIndex: 'complexName', key: 'complexName', width: 120 },
    { title: '楼栋', dataIndex: 'buildingName', key: 'buildingName', width: 80 },
    { title: '房号', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 100 },
    { title: '电话', dataIndex: 'customerPhone', key: 'customerPhone', width: 120 },
    { title: '总价', dataIndex: 'totalPrice', key: 'totalPrice', width: 120, render: money },
    { title: '已收', dataIndex: 'paidAmount', key: 'paidAmount', width: 120, render: (v: number) => <span style={{ color: '#3f8600' }}>{money(v)}</span> },
    { title: '待收', dataIndex: 'unpaidAmount', key: 'unpaidAmount', width: 120, render: (v: number) => <span style={{ color: '#cf1322' }}>{money(v)}</span> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => {
        const option = statusOptions.find((o) => o.value === status);
        return <Tag color={option?.color}>{option?.label || '未知'}</Tag>;
      },
    },
    { title: '签约日期', dataIndex: 'signDate', key: 'signDate', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
          财务详情
        </Button>
      ),
    },
  ];

  const cashFlowColumns = [
    { title: '发生日期', dataIndex: 'occurredAt', key: 'occurredAt', width: 150, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 90,
      render: (direction: string) => direction === 'in' ? <Tag color="green">收入</Tag> : <Tag color="red">支出</Tag>,
    },
    { title: '类型', dataIndex: 'category', key: 'category', width: 110, render: (v: string) => <Tag>{v}</Tag> },
    { title: '款项', dataIndex: 'typeLabel', key: 'typeLabel', width: 110 },
    { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 150 },
    { title: '客户/收款方', dataIndex: 'payeeName', key: 'payeeName', width: 120 },
    { title: '房源', dataIndex: 'roomLabel', key: 'roomLabel', width: 220, ellipsis: true },
    { title: '方式', dataIndex: 'methodLabel', key: 'methodLabel', width: 110 },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (value: number, record: any) => (
        <span style={{ color: record.direction === 'in' ? '#3f8600' : '#cf1322', fontWeight: 600 }}>
          {moneySigned(value, record.direction)}
        </span>
      ),
    },
    { title: '经办', dataIndex: 'operator', key: 'operator', width: 100 },
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 180, ellipsis: true },
  ];

  const payableColumns = [
    { title: '类型', dataIndex: 'sourceTypeLabel', key: 'sourceTypeLabel', width: 90, render: (v: string) => <Tag color={v === '佣金' ? 'blue' : 'purple'}>{v}</Tag> },
    { title: '款项', dataIndex: 'typeLabel', key: 'typeLabel', width: 110 },
    { title: '收款方', dataIndex: 'payeeName', key: 'payeeName', width: 120 },
    { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 150 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 110 },
    { title: '房源', dataIndex: 'roomLabel', key: 'roomLabel', width: 220, ellipsis: true },
    { title: '开户行', dataIndex: 'bankName', key: 'bankName', width: 120, render: (v: string) => v || '-' },
    { title: '账号', dataIndex: 'bankAccount', key: 'bankAccount', width: 160, render: (v: string) => v || '-' },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 130, render: (v: number) => <strong>{money(v)}</strong> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: any) => {
        const item = payableStatusMap[status];
        return <Tag color={item?.color}>{record.statusLabel || item?.text || '未知'}</Tag>;
      },
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' },
    {
      title: '付款操作',
      key: 'action',
      width: 130,
      fixed: 'right' as const,
      render: (_: any, record: any) => record.canPay ? (
        <Popconfirm title="确认已经完成付款？" onConfirm={() => handlePayablePay(record)}>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}>确认付款</Button>
        </Popconfirm>
      ) : (
        <Button size="small" disabled>{record.status === 0 ? '待审核' : '不可付款'}</Button>
      ),
    },
  ];

  const receivableColumns = [
    { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 150 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 100 },
    { title: '电话', dataIndex: 'customerPhone', key: 'customerPhone', width: 120 },
    { title: '房源', dataIndex: 'roomLabel', key: 'roomLabel', width: 220, ellipsis: true },
    { title: '置业顾问', dataIndex: 'salesPersonName', key: 'salesPersonName', width: 100 },
    { title: '总价', dataIndex: 'totalPrice', key: 'totalPrice', width: 120, render: money },
    { title: '已收', dataIndex: 'paidAmount', key: 'paidAmount', width: 120, render: (v: number) => <span style={{ color: '#3f8600' }}>{money(v)}</span> },
    { title: '应收余额', dataIndex: 'unpaidAmount', key: 'unpaidAmount', width: 130, render: (v: number) => <strong style={{ color: '#cf1322' }}>{money(v)}</strong> },
    { title: '回款率', dataIndex: 'paidRatio', key: 'paidRatio', width: 90, render: (v: number) => `${v || 0}%` },
    { title: '签约日', dataIndex: 'signDate', key: 'signDate', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
    { title: '应收截止', dataIndex: 'dueDate', key: 'dueDate', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
    {
      title: '账龄',
      dataIndex: 'agingLabel',
      key: 'agingLabel',
      width: 120,
      render: (label: string, record: any) => {
        const colorMap: Record<string, string> = {
          not_due: 'green',
          due_soon: 'gold',
          overdue_1_30: 'orange',
          overdue_31_60: 'volcano',
          overdue_60: 'red',
          paid: 'green',
        };
        return <Tag color={colorMap[record.agingBucket] || 'default'}>{label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
          收款处理
        </Button>
      ),
    },
  ];

  const paymentQueueColumns = [
    { title: '付款日期', dataIndex: 'paymentDate', key: 'paymentDate', width: 120, render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-' },
    { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 150 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 100 },
    { title: '房源', dataIndex: 'roomLabel', key: 'roomLabel', width: 220, ellipsis: true },
    { title: '款项', dataIndex: 'typeLabel', key: 'typeLabel', width: 100 },
    { title: '方式', dataIndex: 'methodLabel', key: 'methodLabel', width: 110 },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => <strong>{money(v)}</strong> },
    { title: '开户行', dataIndex: 'bankName', key: 'bankName', width: 120, render: (v: string) => v || '-' },
    { title: '账号', dataIndex: 'bankAccount', key: 'bankAccount', width: 160, render: (v: string) => v || '-' },
    { title: '经办人', dataIndex: 'operator', key: 'operator', width: 100, render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: any) => {
        if (status === 1) return <Tag color="green">{record.statusLabel}</Tag>;
        if (status === 2) return <Tag color="red">{record.statusLabel}</Tag>;
        return <Tag color="orange">{record.statusLabel}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          {record.status === 0 && (
            <Button type="link" size="small" onClick={() => handlePaymentStatus(record.id, 1)}>确认</Button>
          )}
          {record.status === 1 && (
            <Popconfirm title="确认标记为退款？" onConfirm={() => handlePaymentStatus(record.id, 2)}>
              <Button type="link" danger size="small">退款</Button>
            </Popconfirm>
          )}
          <Button type="link" size="small" onClick={() => handleViewDetail({ id: record.transactionId, contractNo: record.contractNo })}>详情</Button>
        </Space>
      ),
    },
  ];

  const paymentColumns = [
    { title: '付款类型', dataIndex: 'type', key: 'type', render: (t: string) => paymentTypeOptions.find(o => o.value === t)?.label || t },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => money(v) },
    { title: '付款日期', dataIndex: 'paymentDate', key: 'paymentDate', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
    { title: '付款方式', dataIndex: 'paymentMethod', key: 'paymentMethod', render: (m: string) => paymentMethodOptions.find(o => o.value === m)?.label || m || '-' },
    { title: '银行账号', dataIndex: 'bankAccount', key: 'bankAccount', render: (v: string) => v || '-' },
    { title: '经办人', dataIndex: 'operator', key: 'operator', render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: number) => {
        if (s === 1) return <Tag color="green">已确认</Tag>;
        if (s === 2) return <Tag color="red">已退款</Tag>;
        return <Tag color="orange">待确认</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 0 && (
            <Button type="link" size="small" onClick={() => handlePaymentStatus(record.id, 1)}>确认</Button>
          )}
          {record.status === 1 && (
            <Popconfirm title="确认标记为已退款？" onConfirm={() => handlePaymentStatus(record.id, 2)}>
              <Button type="link" danger size="small">退款</Button>
            </Popconfirm>
          )}
          {record.status === 0 && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDeletePayment(record.id)}>
              <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const renderStats = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="成交总数" value={stats.totalTransactions || 0} /></Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="成交总额" value={stats.totalAmount || 0} prefix="¥" precision={0} /></Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="已收款" value={stats.totalPaid || 0} prefix="¥" precision={0} valueStyle={{ color: '#3f8600' }} /></Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="待收款" value={stats.totalUnpaid || 0} prefix="¥" precision={0} valueStyle={{ color: '#cf1322' }} /></Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="回款率" value={stats.collectionRate || 0} suffix="%" precision={2} /></Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="资金流入" value={stats.cashIn || 0} prefix="¥" precision={0} valueStyle={{ color: '#3f8600' }} /></Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="资金流出" value={stats.cashOut || 0} prefix="¥" precision={0} valueStyle={{ color: '#cf1322' }} /></Card>
      </Col>
      <Col xs={24} sm={12} lg={6} xl={3}>
        <Card><Statistic title="净现金流" value={stats.netCashFlow || 0} prefix="¥" precision={0} valueStyle={{ color: (stats.netCashFlow || 0) >= 0 ? '#3f8600' : '#cf1322' }} /></Card>
      </Col>
    </Row>
  );

  const renderLedger = () => (
    <>
      {renderLedgerFilters()}
      <Card>
        <Table
          columns={ledgerColumns}
          dataSource={ledgerData}
          rowKey="id"
          loading={ledgerLoading}
          scroll={{ x: 1450 }}
          size="small"
          pagination={{
            current: ledgerPagination.page,
            pageSize: ledgerPagination.limit,
            total: ledgerPagination.total,
            onChange: (page, limit) => loadLedger(page, limit),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Card>
    </>
  );

  const renderCashFlow = () => (
    <>
      {renderCashFlowFilters()}
      <Card>
        <Table
          columns={cashFlowColumns}
          dataSource={cashFlowData}
          rowKey="id"
          loading={cashFlowLoading}
          scroll={{ x: 1500 }}
          size="small"
          pagination={{
            current: cashFlowPagination.page,
            pageSize: cashFlowPagination.limit,
            total: cashFlowPagination.total,
            onChange: (page, limit) => loadCashFlow(page, limit),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Card>
    </>
  );

  const renderPayables = () => (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="付款权限说明"
        description="财务端只允许对已经审核通过的佣金和提现执行“确认付款”。待审核、已付款、已拒绝的款项会保留在列表中，但不能重复付款。"
      />
      {renderPayableFilters()}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Popconfirm title="确认批量付款？" onConfirm={handleBatchPay}>
              <Button
                type="primary"
                icon={<CheckSquareOutlined />}
                disabled={!selectedPayableRows.some((row) => row.canPay)}
              >
                批量确认付款
              </Button>
            </Popconfirm>
            <span style={{ color: '#5c6b73' }}>
              已选择 {selectedPayableRows.filter((row) => row.canPay).length} 笔可付款记录
            </span>
          </Space>
        </div>
        <Table
          columns={payableColumns}
          dataSource={payableData}
          rowKey="id"
          loading={payableLoading}
          rowSelection={{
            selectedRowKeys: selectedPayableRowKeys,
            onChange: (keys, rows) => {
              setSelectedPayableRowKeys(keys);
              setSelectedPayableRows(rows);
            },
            getCheckboxProps: (record: any) => ({
              disabled: !record.canPay,
            }),
          }}
          scroll={{ x: 1600 }}
          size="small"
          pagination={{
            current: payablePagination.page,
            pageSize: payablePagination.limit,
            total: payablePagination.total,
            onChange: (page, limit) => loadPayables(page, limit),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Card>
    </>
  );

  const renderReceivables = () => (
    <>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="应收催款"
        description="按签约后30天作为默认应收截止日，自动计算未到期、7天内到期和逾期账龄，帮助财务优先处理高风险回款。"
      />
      {renderReceivableFilters()}
      <Card>
        <Table
          columns={receivableColumns}
          dataSource={receivableData}
          rowKey="id"
          loading={receivableLoading}
          scroll={{ x: 1550 }}
          size="small"
          pagination={{
            current: receivablePagination.page,
            pageSize: receivablePagination.limit,
            total: receivablePagination.total,
            onChange: (page, limit) => loadReceivables(page, limit),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Card>
    </>
  );

  const renderPaymentQueue = () => (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="收款确认"
        description="把所有收款记录集中到一个队列里，财务可以批量确认待确认收款，也可以标记退款。"
      />
      {renderPaymentQueueFilters()}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Popconfirm title="确认批量确认收款？" onConfirm={() => handleBatchConfirmPayment(1)}>
              <Button
                type="primary"
                icon={<CheckSquareOutlined />}
                disabled={!selectedPaymentRowKeys.length}
              >
                批量确认收款
              </Button>
            </Popconfirm>
            <span style={{ color: '#5c6b73' }}>已选择 {selectedPaymentRowKeys.length} 笔收款记录</span>
          </Space>
        </div>
        <Table
          columns={paymentQueueColumns}
          dataSource={paymentQueueData}
          rowKey="id"
          loading={paymentQueueLoading}
          rowSelection={{
            selectedRowKeys: selectedPaymentRowKeys,
            onChange: (keys, rows) => {
              setSelectedPaymentRowKeys(rows.filter((row: any) => row.status === 0).map((row: any) => row.id));
            },
            getCheckboxProps: (record: any) => ({
              disabled: record.status !== 0,
            }),
          }}
          scroll={{ x: 1550 }}
          size="small"
          pagination={{
            current: paymentQueuePagination.page,
            pageSize: paymentQueuePagination.limit,
            total: paymentQueuePagination.total,
            onChange: (page, limit) => loadPaymentQueue(page, limit),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
        />
      </Card>
    </>
  );

  const renderReconciliation = () => {
    const paymentTypeSummary = reconciliationData.paymentTypeSummary || [];
    const paymentMethodSummary = reconciliationData.paymentMethodSummary || [];
    const monthlyCashFlow = reconciliationData.monthlyCashFlow || [];
    const receivableAgingSummary = reconciliationData.receivableAgingSummary || [];
    const payableSummary = reconciliationData.payableSummary || {};

    const summaryColumns = [
      { title: '名称', dataIndex: 'name', key: 'name' },
      { title: '笔数', dataIndex: 'count', key: 'count', render: (v: number) => v || 0 },
      { title: '金额', dataIndex: 'amount', key: 'amount', render: money },
    ];

    return (
      <>
        {renderReconciliationFilters()}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Card loading={reconciliationLoading}>
              <Statistic title="待付佣金" value={payableSummary.commissionPendingPay || 0} prefix="¥" precision={0} valueStyle={{ color: '#1677ff' }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card loading={reconciliationLoading}>
              <Statistic title="待打款提现" value={payableSummary.withdrawalPendingPay || 0} prefix="¥" precision={0} valueStyle={{ color: '#722ed1' }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card loading={reconciliationLoading}>
              <Statistic title="已付支出" value={(payableSummary.commissionPaid || 0) + (payableSummary.withdrawalPaid || 0)} prefix="¥" precision={0} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="按款项类型汇总" loading={reconciliationLoading}>
              <Table columns={summaryColumns} dataSource={paymentTypeSummary} rowKey="name" size="small" pagination={false} />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="按收款方式汇总" loading={reconciliationLoading}>
              <Table columns={summaryColumns} dataSource={paymentMethodSummary} rowKey="name" size="small" pagination={false} />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="应收账龄汇总" loading={reconciliationLoading}>
              <Table columns={summaryColumns} dataSource={receivableAgingSummary} rowKey="key" size="small" pagination={false} />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="月度现金流" loading={reconciliationLoading}>
              <Table
                dataSource={monthlyCashFlow}
                rowKey="month"
                size="small"
                pagination={false}
                columns={[
                  { title: '月份', dataIndex: 'month', key: 'month' },
                  { title: '收入', dataIndex: 'income', key: 'income', render: (v: number) => <span style={{ color: '#3f8600' }}>{money(v)}</span> },
                  { title: '支出', dataIndex: 'expense', key: 'expense', render: (v: number) => <span style={{ color: '#cf1322' }}>{money(v)}</span> },
                  { title: '净额', dataIndex: 'net', key: 'net', render: (v: number) => <strong style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>{money(v)}</strong> },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  const renderPermissionGuide = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12} xl={6}>
        <Card title={<Space><MoneyCollectOutlined />收款登记</Space>}>
          <p>登记定金、首付、按揭、尾款等客户款项，形成收款台账和资金流入。</p>
          <Progress percent={100} status="success" showInfo={false} />
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card title={<Space><TransactionOutlined />资金流水</Space>}>
          <p>统一查看客户收款、佣金发放、分销提现打款，便于日清月结。</p>
          <Progress percent={100} status="success" showInfo={false} />
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card title={<Space><AuditOutlined />付款权限</Space>}>
          <p>财务只对审核通过的款项确认付款，避免未审先付和重复付款。</p>
          <Progress percent={100} status="success" showInfo={false} />
        </Card>
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Card title={<Space><FileTextOutlined />价格变更</Space>}>
          <p>记录折扣、面积差、调价等变更原因，保留可追溯的价格轨迹。</p>
          <Progress percent={100} status="success" showInfo={false} />
        </Card>
      </Col>
      <Col span={24}>
        <Card title="财务端建议流程">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Alert type="success" showIcon message="1. 收款" description="在收款台账中进入财务详情，登记客户付款，系统同步更新已收/待收。" />
            </Col>
            <Col xs={24} md={8}>
              <Alert type="warning" showIcon message="2. 审核后付款" description="佣金和提现先由业务/风控审核，财务端只负责最终付款确认。" />
            </Col>
            <Col xs={24} md={8}>
              <Alert type="info" showIcon message="3. 对账" description="通过资金流水核对每一笔收入和支出，统计净现金流和待付款余额。" />
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );

  return (
    <div>
      <Card
        style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f6ffed 0%, #e6f7ff 100%)' }}
        bodyStyle={{ padding: 20 }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={4}>
              <h2 style={{ margin: 0 }}>财务资金中心</h2>
              <span style={{ color: '#5c6b73' }}>覆盖应收催款、收款确认、资金流水、付款权限和对账汇总，让财务端真正形成资金闭环。</span>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Row gutter={12}>
              <Col span={12}>
                <Card size="small">
                  <Statistic title="待发放佣金" value={stats.pendingCommissionAmount || 0} prefix="¥" precision={0} valueStyle={{ color: '#1677ff' }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic title="待打款提现" value={stats.pendingWithdrawalAmount || 0} prefix="¥" precision={0} valueStyle={{ color: '#722ed1' }} />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {renderStats()}

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'ledger',
              label: <Space><WalletOutlined />收款台账</Space>,
              children: renderLedger(),
            },
            {
              key: 'receivables',
              label: <Space><ExclamationCircleOutlined />应收催款</Space>,
              children: renderReceivables(),
            },
            {
              key: 'paymentQueue',
              label: <Space><CheckSquareOutlined />收款确认</Space>,
              children: renderPaymentQueue(),
            },
            {
              key: 'cashFlow',
              label: <Space><SwapOutlined />资金流水</Space>,
              children: renderCashFlow(),
            },
            {
              key: 'payables',
              label: <Space><ClockCircleOutlined />付款权限</Space>,
              children: renderPayables(),
            },
            {
              key: 'reconciliation',
              label: <Space><BarChartOutlined />对账汇总</Space>,
              children: renderReconciliation(),
            },
            {
              key: 'guide',
              label: <Space><AuditOutlined />权限说明</Space>,
              children: renderPermissionGuide(),
            },
          ]}
        />
      </Card>

      <Modal
        title={`成交财务详情 - ${selectedTransaction?.contractNo || ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[<Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>]}
        width={960}
      >
        {detailData && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <div>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="合同编号">{detailData.transaction.contractNo}</Descriptions.Item>
                      <Descriptions.Item label="签约日期">{dayjs(detailData.transaction.signDate).format('YYYY-MM-DD')}</Descriptions.Item>
                      <Descriptions.Item label="楼盘">{detailData.room?.building?.complex?.name}</Descriptions.Item>
                      <Descriptions.Item label="楼栋">{detailData.room?.building?.name}</Descriptions.Item>
                      <Descriptions.Item label="房号">{detailData.room?.unit}</Descriptions.Item>
                      <Descriptions.Item label="户型">{detailData.room?.roomType}</Descriptions.Item>
                      <Descriptions.Item label="面积">{detailData.room?.area}㎡</Descriptions.Item>
                      <Descriptions.Item label="单价">{money(getCurrentUnitPrice())}/㎡</Descriptions.Item>
                      <Descriptions.Item label="总价">{money(detailData.transaction.totalPrice)}</Descriptions.Item>
                      <Descriptions.Item label="已收金额">{money(detailData.paymentSummary.total)}</Descriptions.Item>
                      <Descriptions.Item label="待收金额">{money(detailData.unpaidAmount)}</Descriptions.Item>
                      <Descriptions.Item label="客户">{detailData.customer?.name}</Descriptions.Item>
                      <Descriptions.Item label="电话">{detailData.customer?.phone}</Descriptions.Item>
                      <Descriptions.Item label="置业顾问">{detailData.salesPerson?.name}</Descriptions.Item>
                    </Descriptions>

                    <Divider>付款摘要</Divider>
                    <Row gutter={[16, 16]}>
                      <Col xs={12} md={6}><Statistic title="定金" value={detailData.paymentSummary.deposit} prefix="¥" /></Col>
                      <Col xs={12} md={6}><Statistic title="首付" value={detailData.paymentSummary.downPayment} prefix="¥" /></Col>
                      <Col xs={12} md={6}><Statistic title="按揭" value={detailData.paymentSummary.mortgage} prefix="¥" /></Col>
                      <Col xs={12} md={6}><Statistic title="尾款" value={detailData.paymentSummary.finalPayment} prefix="¥" /></Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: 'payments',
                label: `付款记录 (${detailData.transaction.paymentRecords?.length || 0})`,
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setSelectedTransaction(detailData.transaction);
                          paymentForm.setFieldsValue({
                            transactionId: detailData.transaction.id,
                            paymentDate: dayjs(),
                          });
                          setPaymentModalVisible(true);
                        }}
                        disabled={detailData.unpaidAmount <= 0}
                      >
                        登记收款
                      </Button>
                    </div>
                    <Table
                      columns={paymentColumns}
                      dataSource={detailData.transaction.paymentRecords || []}
                      rowKey="id"
                      size="small"
                      pagination={false}
                    />
                  </div>
                ),
              },
              {
                key: 'priceChanges',
                label: `价格变更 (${detailData.transaction.priceChangeRecords?.length || 0})`,
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const oldUnitPrice = getCurrentUnitPrice();
                          setSelectedTransaction(detailData.transaction);
                          priceChangeForm.setFieldsValue({
                            transactionId: detailData.transaction.id,
                            newPrice: oldUnitPrice,
                            newTotalPrice: detailData.transaction.totalPrice,
                            diffAmount: 0,
                          });
                          setPriceChangeModalVisible(true);
                        }}
                      >
                        价格变更
                      </Button>
                    </div>
                    <Table
                      dataSource={detailData.transaction.priceChangeRecords || []}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={[
                        { title: '变更类型', dataIndex: 'changeType' },
                        { title: '原价', dataIndex: 'oldTotalPrice', render: money },
                        { title: '新价', dataIndex: 'newTotalPrice', render: money },
                        {
                          title: '差额',
                          dataIndex: 'diffAmount',
                          render: (v: number) => (
                            <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
                              {v >= 0 ? `+${money(v)}` : `-${money(Math.abs(v))}`}
                            </span>
                          ),
                        },
                        { title: '原因', dataIndex: 'reason' },
                        { title: '经办人', dataIndex: 'operator' },
                        { title: '变更时间', dataIndex: 'createdAt', render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        title="登记收款"
        open={paymentModalVisible}
        onOk={handleAddPayment}
        onCancel={() => {
          setPaymentModalVisible(false);
          paymentForm.resetFields();
        }}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="transactionId" hidden><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="付款类型" rules={[{ required: true, message: '请选择付款类型' }]}>
                <Select placeholder="请选择" options={paymentTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="付款金额" rules={[{ required: true, message: '请输入付款金额' }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" placeholder="请输入金额" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paymentDate" label="付款日期" rules={[{ required: true, message: '请选择付款日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentMethod" label="付款方式">
                <Select placeholder="请选择" options={paymentMethodOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bankName" label="开户行">
                <Input placeholder="如：工商银行" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bankAccount" label="收款账号">
                <Input placeholder="请输入账号" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="operator" label="经办人">
            <Input placeholder="请输入经办人" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="价格变更"
        open={priceChangeModalVisible}
        onOk={handlePriceChange}
        onCancel={() => {
          setPriceChangeModalVisible(false);
          priceChangeForm.resetFields();
        }}
      >
        <Form form={priceChangeForm} layout="vertical">
          <Form.Item name="transactionId" hidden><Input /></Form.Item>
          <Form.Item name="changeType" label="变更类型" rules={[{ required: true, message: '请选择变更类型' }]}>
            <Select
              placeholder="请选择"
              options={[
                { label: '折扣变更', value: 'discount' },
                { label: '面积差变更', value: 'area_diff' },
                { label: '价格调整', value: 'price_adjust' },
              ]}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="原总价">
                <Input value={money(detailData?.transaction?.totalPrice || 0)} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="原单价">
                <Input value={`${money(getCurrentUnitPrice())}/㎡`} disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="newTotalPrice" label="新房总价" rules={[{ required: true, message: '请输入新总价' }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  placeholder="请输入新总价"
                  onChange={(value) => {
                    const oldTotal = detailData?.transaction?.totalPrice || 0;
                    const area = detailData?.room?.area || 0;
                    priceChangeForm.setFieldsValue({
                      diffAmount: (value || 0) - oldTotal,
                      newPrice: area > 0 ? Number(((value || 0) / area).toFixed(2)) : getCurrentUnitPrice(),
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="newPrice" label="新单价" rules={[{ required: true, message: '请输入新单价' }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" placeholder="请输入新单价" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="diffAmount" label="差额（正数表示补款，负数表示退款）">
            <InputNumber style={{ width: '100%' }} precision={2} prefix="¥" />
          </Form.Item>
          <Form.Item name="reason" label="变更原因">
            <TextArea rows={2} placeholder="请输入变更原因" />
          </Form.Item>
          <Form.Item name="operator" label="经办人">
            <Input placeholder="请输入经办人" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Finance;
