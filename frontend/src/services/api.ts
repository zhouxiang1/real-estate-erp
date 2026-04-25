import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/profile'),
};

// User API
export const userApi = {
  list: (params?: { page?: number; limit?: number; keyword?: string; roleCode?: string }) =>
    api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Role API
export const roleApi = {
  list: (params?: { keyword?: string }) =>
    api.get('/roles', { params }),
  get: (id: string) => api.get(`/roles/${id}`),
  create: (data: { name: string; code: string; description?: string; permissions?: string[] }) =>
    api.post('/roles', data),
  update: (id: string, data: { name?: string; code?: string; description?: string; permissions?: string[] }) =>
    api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
};

// Department API
export const departmentApi = {
  list: () => api.get('/departments'),
  tree: () => api.get('/departments/tree'),
  select: () => api.get('/departments/select'),
  get: (id: string) => api.get(`/departments/${id}`),
  create: (data: { name: string; parentId?: string; sort?: number }) =>
    api.post('/departments', data),
  update: (id: string, data: { name?: string; parentId?: string | null; sort?: number }) =>
    api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

// Project API
export const projectApi = {
  // 楼盘
  createComplex: (data: any) => api.post('/project/complex', data),
  listComplex: (params?: { page?: number; limit?: number; keyword?: string }) =>
    api.get('/project/complex', { params }),
  getComplex: (id: string) => api.get(`/project/complex/${id}`),
  updateComplex: (id: string, data: any) => api.put(`/project/complex/${id}`, data),
  deleteComplex: (id: string) => api.delete(`/project/complex/${id}`),

  // 楼栋
  createBuilding: (data: any) => api.post('/project/building', data),
  listBuildings: (complexId: string) => api.get('/project/building', { params: { complexId } }),
  updateBuilding: (id: string, data: any) => api.put(`/project/building/${id}`, data),
  deleteBuilding: (id: string) => api.delete(`/project/building/${id}`),

  // 房源
  createRoom: (data: any) => api.post('/project/room', data),
  createRoomsBatch: (data: any[]) => api.post('/project/room/batch', data),
  // 导出房源模板
  exportRoomTemplate: (buildingId: string) => api.get(`/project/room/export-template/${buildingId}`),
  // 导入房源数据
  importRooms: (buildingId: string, data: any[]) => api.post('/project/room/import', { buildingId, data }),
  listRooms: (params?: {
    page?: number;
    limit?: number;
    buildingId?: string;
    complexId?: string;
    status?: number;
    floor?: number;
    keyword?: string;
  }) => api.get('/project/room', { params }),
  getRoom: (id: string) => api.get(`/project/room/${id}`),
  updateRoom: (id: string, data: any) => api.put(`/project/room/${id}`, data),
  updateRoomStatus: (id: string, status: number) =>
    api.put(`/project/room/${id}/status`, { status }),
  deleteRoom: (id: string) => api.delete(`/project/room/${id}`),
  getRoomStats: (complexId?: string) => api.get('/project/room-stats', { params: { complexId } }),

  // 销控
  lockRoom: (id: string, lock: boolean) =>
    api.put(`/project/room/${id}/lock`, { lock }),
  confirmSale: (id: string) => api.put(`/project/room/${id}/confirm-sale`),
  getInventory: (complexId: string) => api.get(`/project/inventory/${complexId}`),
};

// Customer API
export const customerApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: number;
    level?: string;
    source?: string;
    keyword?: string;
    userId?: string;
  }) => api.get('/customer', { params }),
  get: (id: string) => api.get(`/customer/${id}`),
  create: (data: any) => api.post('/customer', data),
  update: (id: string, data: any) => api.put(`/customer/${id}`, data),
  delete: (id: string) => api.delete(`/customer/${id}`),

  // 查重检查
  checkDuplicate: (phone?: string, name?: string) =>
    api.get('/customer/check', { params: { phone, name } }),

  // 跟进记录
  createFollowup: (customerId: string, data: any) =>
    api.post(`/customer/${customerId}/followup`, data),
  listFollowups: (customerId: string) =>
    api.get(`/customer/${customerId}/followups`),

  // 统计
  getStats: (userId?: string) => api.get('/customer/stats/count', { params: { userId } }),

  // 公共池
  getPublicPoolList: (params?: { page?: number; limit?: number }) =>
    api.get('/customer/public-pool/list', { params }),
  moveToPublicPool: (id: string) => api.post(`/customer/${id}/to-public-pool`),
  claimFromPublicPool: (id: string, userId: string) =>
    api.post(`/customer/${id}/claim`, { userId }),
};

// Transaction API
export const transactionApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: number;
    startDate?: string;
    endDate?: string;
    keyword?: string;
    salesPersonId?: string;
  }) => api.get('/transaction', { params }),
  get: (id: string) => api.get(`/transaction/${id}`),
  create: (data: any) => api.post('/transaction', data),
  update: (id: string, data: any) => api.put(`/transaction/${id}`, data),
  delete: (id: string) => api.delete(`/transaction/${id}`),

  // 统计
  getStats: (params?: {
    startDate?: string;
    endDate?: string;
    salesPersonId?: string;
  }) => api.get('/transaction/stats/sales', { params }),

  // 业务操作
  changeRoom: (id: string, data: { newRoomId: string }) =>
    api.post(`/transaction/${id}/change-room`, data),
  modifyTransaction: (id: string, data: any) =>
    api.put(`/transaction/${id}/modify`, data),
  refundTransaction: (id: string, data: { refundAmount?: number; reason?: string }) =>
    api.put(`/transaction/${id}/refund`, data),
  forfeitTransaction: (id: string, data: { forfeitAmount?: number; reason?: string }) =>
    api.put(`/transaction/${id}/forfeit`, data),

  // 更名
  rename: (id: string, data: { originalCustomerName: string; renameReason?: string }) =>
    api.put(`/transaction/${id}/rename`, data),

  // 权益人管理
  addBeneficiary: (id: string, data: any) =>
    api.post(`/transaction/${id}/beneficiary`, data),
  updateBeneficiary: (transactionId: string, beneficiaryId: string, data: any) =>
    api.put(`/transaction/${transactionId}/beneficiary/${beneficiaryId}`, data),
  deleteBeneficiary: (transactionId: string, beneficiaryId: string) =>
    api.delete(`/transaction/${transactionId}/beneficiary/${beneficiaryId}`),
};

// Commission API
export const commissionApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: number;
    type?: string;
    userId?: string;
  }) => api.get('/commission', { params }),
  get: (id: string) => api.get(`/commission/${id}`),
  update: (id: string, data: any) => api.put(`/commission/${id}`, data),
  audit: (id: string, data: { action: 'approve' | 'reject'; comment?: string }) =>
    api.post(`/commission/${id}/audit`, data),
  batchAudit: (data: {
    ids: string[];
    action: 'approve' | 'reject';
    comment?: string;
  }) => api.post('/commission/batch-audit', data),
  pay: (id: string) => api.put(`/commission/${id}/pay`),
  getStats: (params?: { type?: string; userId?: string }) =>
    api.get('/commission/stats/commission', { params }),
};

// Channel API
export const channelApi = {
  // 合作伙伴
  createPartner: (data: any) => api.post('/channel/partner', data),
  listPartners: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: number;
    keyword?: string;
  }) => api.get('/channel/partner', { params }),
  getPartner: (id: string) => api.get(`/channel/partner/${id}`),
  updatePartner: (id: string, data: any) => api.put(`/channel/partner/${id}`, data),
  deletePartner: (id: string) => api.delete(`/channel/partner/${id}`),
  togglePartnerStatus: (id: string) => api.put(`/channel/partner/${id}/toggle`),
  getPartnerStats: (id: string) => api.get(`/channel/partner/${id}/stats`),

  // 异常监控
  getAnomalies: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/channel/anomalies', { params }),
};

// Distributor API
export const distributorApi = {
  register: (data: any) => api.post('/distributor/register', data),
  list: (params?: {
    page?: number;
    limit?: number;
    status?: number;
    isVerified?: boolean;
    keyword?: string;
  }) => api.get('/distributor', { params }),
  get: (id: string) => api.get(`/distributor/${id}`),
  update: (id: string, data: any) => api.put(`/distributor/${id}`, data),
  delete: (id: string) => api.delete(`/distributor/${id}`),
  toggleStatus: (id: string) => api.put(`/distributor/${id}/toggle`),
  verify: (id: string, data: any) => api.post(`/distributor/${id}/verify`, data),

  // 推荐客户
  recommend: (id: string, data: any) => api.post(`/distributor/${id}/recommend`, data),
  listRecommendations: (id: string) => api.get(`/distributor/${id}/recommendations`),

  // 提现
  withdraw: (id: string, data: any) => api.post(`/distributor/${id}/withdraw`, data),
  listWithdrawals: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/distributor/${id}/withdrawals`, { params }),
  auditWithdrawal: (id: string, data: { action: 'approve' | 'reject'; remark?: string }) =>
    api.post(`/distributor/withdrawal/${id}/audit`, data),
  paidWithdrawal: (id: string) =>
    api.put(`/distributor/withdrawal/${id}/paid`),

  // 统计
  getStats: (id: string) => api.get(`/distributor/${id}/stats`),
  getTeam: (id: string) => api.get(`/distributor/${id}/team`),
};

// Report API
export const reportApi = {
  getSalesReport: (params?: {
    complexId?: string;
    status?: number[];
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) => api.get('/report/sales', { params }),
  exportSalesReport: (params?: {
    complexId?: string;
    status?: number[];
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) => api.get('/report/sales/export', { params }),
};

// Manager Report API - 销售经理经营分析
export const managerReportApi = {
  getBusinessAnalysis: () => api.get('/report/manager/business'),
  getSubscribeRanking: (limit?: number) => api.get('/report/manager/subscribe-ranking', { params: { limit } }),
  getTeamPerformance: () => api.get('/report/manager/team-performance'),
  getProcessAnalysis: () => api.get('/report/manager/process'),
  getBuildingRanking: (limit?: number) => api.get('/report/manager/building-ranking', { params: { limit } }),
  getSubscribeTrend: (days?: number) => api.get('/report/manager/trend', { params: { days } }),
};

// Finance API
export const financeApi = {
  // 付款记录
  getPayments: (transactionId: string) =>
    api.get(`/finance/payment/${transactionId}`),
  createPayment: (data: {
    transactionId: string;
    type: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    bankAccount?: string;
    bankName?: string;
    remark?: string;
    operator?: string;
  }) => api.post('/finance/payment', data),
  updatePaymentStatus: (id: string, status: number) =>
    api.put(`/finance/payment/${id}/status`, { status }),
  batchUpdatePaymentStatus: (ids: string[], status: number) =>
    api.put('/finance/payment/batch-status', { ids, status }),
  deletePayment: (id: string) => api.delete(`/finance/payment/${id}`),

  // 价格变更记录
  getPriceChanges: (transactionId: string) =>
    api.get(`/finance/price-change/${transactionId}`),
  createPriceChange: (data: {
    transactionId: string;
    changeType: string;
    oldPrice: number;
    oldTotalPrice: number;
    newPrice: number;
    newTotalPrice: number;
    diffAmount: number;
    reason?: string;
    operator?: string;
  }) => api.post('/finance/price-change', data),

  // 财务统计
  getSummary: (transactionId: string) =>
    api.get(`/finance/summary/${transactionId}`),
  getList: (params?: {
    page?: number;
    limit?: number;
    complexId?: string;
    status?: number;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) => api.get('/finance/list', { params }),
  getStats: (params?: {
    complexId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/finance/stats', { params }),
  getCashFlow: (params?: {
    page?: number;
    limit?: number;
    direction?: 'in' | 'out';
    category?: string;
    complexId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) => api.get('/finance/cash-flow', { params }),
  getPayables: (params?: {
    page?: number;
    limit?: number;
    status?: number;
    sourceType?: 'commission' | 'withdrawal';
    complexId?: string;
    keyword?: string;
  }) => api.get('/finance/payables', { params }),
  payCommission: (id: string) =>
    api.put(`/finance/payables/commission/${id}/pay`),
  payWithdrawal: (id: string) =>
    api.put(`/finance/payables/withdrawal/${id}/pay`),
  batchPayPayables: (items: Array<{ sourceType: 'commission' | 'withdrawal'; id: string }>) =>
    api.put('/finance/payables/batch-pay', { items }),
  getReceivables: (params?: {
    page?: number;
    limit?: number;
    complexId?: string;
    agingBucket?: string;
    status?: number;
    keyword?: string;
  }) => api.get('/finance/receivables', { params }),
  getPaymentQueue: (params?: {
    page?: number;
    limit?: number;
    status?: number;
    type?: string;
    complexId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) => api.get('/finance/payment-queue', { params }),
  getReconciliation: (params?: {
    complexId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/finance/reconciliation', { params }),
};

// Approval API
export const approvalApi = {
  getActions: () => api.get('/approval/actions'),
  listWorkflows: (params?: { keyword?: string; enabled?: boolean }) =>
    api.get('/approval/workflows', { params }),
  updateWorkflow: (id: string, data: any) =>
    api.put(`/approval/workflows/${id}`, data),
  setWorkflowEnabled: (id: string, enabled: boolean) =>
    api.put(`/approval/workflows/${id}/enabled`, { enabled }),
  listRequests: (params?: {
    page?: number;
    limit?: number;
    status?: number;
    workflowKey?: string;
    mine?: boolean;
    scope?: 'todo' | 'mine' | 'all';
  }) => api.get('/approval/requests', { params }),
  getRequest: (id: string) => api.get(`/approval/requests/${id}`),
  approve: (id: string, comment?: string) =>
    api.post(`/approval/requests/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) =>
    api.post(`/approval/requests/${id}/reject`, { comment }),
};

export default api;
