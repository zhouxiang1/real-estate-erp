import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Progress, List, Avatar, Badge, Modal, Tabs, Button, Alert } from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  DollarOutlined,
  TrophyOutlined,
  TeamOutlined,
  FallOutlined,
  RiseOutlined,
  BankOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { managerReportApi, transactionApi, customerApi } from '../../services/api';
import dayjs from 'dayjs';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<any>(null);
  const [processData, setProcessData] = useState<any>(null);
  const [buildingData, setBuildingData] = useState<any[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailType, setDetailType] = useState<string>('');
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailTitle, setDetailTitle] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('today');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [business, ranking, team, process, building] = await Promise.all([
        managerReportApi.getBusinessAnalysis(),
        managerReportApi.getSubscribeRanking(20),
        managerReportApi.getTeamPerformance(),
        managerReportApi.getProcessAnalysis(),
        managerReportApi.getBuildingRanking(10),
      ]);

      setBusinessData(business.data);
      setRankingData(ranking.data || []);
      setTeamData(team.data);
      setProcessData(process.data);
      setBuildingData(building.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 点击指标卡片查看详情
  const handleCardClick = async (type: string, title: string) => {
    setDetailType(type);
    setDetailTitle(title);
    setDetailModalVisible(true);

    try {
      let data: any[] = [];
      switch (type) {
        case 'newVisit':
        case 'oldVisit': {
          // 获取新客/老客来访明细
          const customerRes = await customerApi.list({ page: 1, limit: 100 });
          const customers = (customerRes.data.data || []).filter((c: any) => {
            // 新客是时间段内创建的
            const createdDate = dayjs(c.createdAt);
            const isInRange = true; // 需要根据实际时间段过滤
            const isNew = type === 'newVisit';
            // 新客：无成交记录的客户
            const hasTransaction = c.status >= 1;
            return isInRange && (isNew ? !hasTransaction : hasTransaction);
          });
          data = customers.slice(0, 50).map((c: any, idx: number) => ({
            key: c.id || idx,
            name: c.name,
            phone: c.phone || '-',
            source: c.source || '-',
            level: c.level || '-',
            status: c.status === 0 ? '潜在' : c.status === 1 ? '意向' : '成交',
            consultant: c.consultant?.name || '-',
            createdAt: dayjs(c.createdAt).format('YYYY-MM-DD'),
          }));
          break;
        }
        case 'subscribe':
        case 'deal': {
          const status = type === 'subscribe' ? 3 : 4;
          const txRes = await transactionApi.list({ page: 1, limit: 50, status });
          data = (txRes.data.data || []).map((tx: any) => ({
            key: tx.id,
            contractNo: tx.contractNo,
            name: tx.customer?.name || '-',
            phone: tx.customer?.phone || '-',
            room: `${tx.room?.building?.complex?.name || ''} ${tx.room?.building?.name || ''} ${tx.room?.unit || ''}`,
            amount: tx.totalPrice,
            paidAmount: tx.paidAmount,
            date: dayjs(tx.signDate).format('YYYY-MM-DD'),
            consultant: tx.salesPerson?.name || '-',
          }));
          break;
        }
        case 'amount': {
          const amountRes = await transactionApi.list({ page: 1, limit: 50 });
          data = (amountRes.data.data || [])
            .filter((tx: any) => tx.status !== 2)
            .map((tx: any) => ({
              key: tx.id,
              contractNo: tx.contractNo,
              name: tx.customer?.name || '-',
              phone: tx.customer?.phone || '-',
              room: `${tx.room?.building?.complex?.name || ''} ${tx.room?.building?.name || ''} ${tx.room?.unit || ''}`,
              amount: tx.totalPrice,
              paidAmount: tx.paidAmount,
              date: dayjs(tx.signDate).format('YYYY-MM-DD'),
              consultant: tx.salesPerson?.name || '-',
            }));
          break;
        }
      }
      setDetailData(data);
    } catch (error) {
      console.error('Failed to load detail:', error);
    }
  };

  // 根据时间范围获取数据
  const getCurrentStats = () => {
    if (!businessData) return null;
    switch (activeTab) {
      case 'today': return businessData.today;
      case 'week': return businessData.week;
      case 'month': return businessData.month;
      case 'quarter': return businessData.quarter;
      case 'year': return businessData.year;
      default: return businessData.today;
    }
  };

  const currentStats = getCurrentStats();

  // 详情列定义
  const getDetailColumns = () => {
    switch (detailType) {
      case 'newVisit':
      case 'oldVisit':
        return [
          { title: '客户姓名', dataIndex: 'name', key: 'name' },
          { title: '电话', dataIndex: 'phone', key: 'phone' },
          { title: '来源', dataIndex: 'source', key: 'source' },
          { title: '等级', dataIndex: 'level', key: 'level' },
          { title: '状态', dataIndex: 'status', key: 'status' },
          { title: '置业顾问', dataIndex: 'consultant', key: 'consultant' },
          { title: '录入日期', dataIndex: 'createdAt', key: 'createdAt' },
        ];
      case 'subscribe':
        return [
          { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo' },
          { title: '客户', dataIndex: 'name', key: 'name' },
          { title: '电话', dataIndex: 'phone', key: 'phone' },
          { title: '房源', dataIndex: 'room', key: 'room' },
          { title: '认购金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${v?.toLocaleString()}` },
          { title: '认购日期', dataIndex: 'date', key: 'date' },
          { title: '置业顾问', dataIndex: 'consultant', key: 'consultant' },
        ];
      case 'deal':
        return [
          { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo' },
          { title: '客户', dataIndex: 'name', key: 'name' },
          { title: '电话', dataIndex: 'phone', key: 'phone' },
          { title: '房源', dataIndex: 'room', key: 'room' },
          { title: '成交金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${v?.toLocaleString()}` },
          { title: '已付金额', dataIndex: 'paidAmount', key: 'paidAmount', render: (v: number) => `¥${v?.toLocaleString()}` },
          { title: '签约日期', dataIndex: 'date', key: 'date' },
          { title: '置业顾问', dataIndex: 'consultant', key: 'consultant' },
        ];
      default:
        return [];
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>经营分析</h2>
      </div>

      {/* 过程分析 - 漏斗 - 放在最前面 */}
      {processData && (
        <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '20px 24px' } }}>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>客户跟进与成交漏斗</span>
              <Tag color="blue">本月</Tag>
            </Space>
          </div>
          <Row gutter={32} align="middle">
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '20px 0', background: '#e6f7ff', borderRadius: 8 }}>
                <div style={{ fontSize: 40, fontWeight: 'bold', color: '#1890ff' }}>{processData.visitCount}</div>
                <div style={{ color: '#666', marginTop: 8 }}>客户来访（组）</div>
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" ghost size="small" onClick={() => handleCardClick('newVisit', '新客来访明细')}>
                    新客 {Math.round(processData.visitCount * 0.7)}组
                  </Button>
                  <Button type="primary" ghost size="small" style={{ marginLeft: 8 }} onClick={() => handleCardClick('oldVisit', '老客来访明细')}>
                    老客 {Math.round(processData.visitCount * 0.3)}组
                  </Button>
                </div>
              </div>
            </Col>
            <Col span={2} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, color: '#52c41a' }}>↓</div>
              <div style={{ fontSize: 12, color: '#888' }}>{processData.visitToSubscribeRate}%</div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '20px 0', background: '#f6ffed', borderRadius: 8 }}>
                <div style={{ fontSize: 40, fontWeight: 'bold', color: '#52c41a' }}>{processData.subscribeCount}</div>
                <div style={{ color: '#666', marginTop: 8 }}>认购（套）</div>
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" size="small" onClick={() => handleCardClick('subscribe', '认购明细')}>
                    查看明细
                  </Button>
                </div>
              </div>
            </Col>
            <Col span={2} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, color: '#52c41a' }}>↓</div>
              <div style={{ fontSize: 12, color: '#888' }}>{processData.subscribeToDealRate}%</div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '20px 0', background: '#fff1f0', borderRadius: 8 }}>
                <div style={{ fontSize: 40, fontWeight: 'bold', color: '#f5222d' }}>{processData.dealCount}</div>
                <div style={{ color: '#666', marginTop: 8 }}>成交（套）</div>
                <div style={{ marginTop: 12 }}>
                  <Button danger size="small" onClick={() => handleCardClick('deal', '成交明细')}>
                    查看明细
                  </Button>
                </div>
              </div>
            </Col>
            <Col span={2} style={{ textAlign: 'center' }}>
              <div style={{ color: '#faad14', fontWeight: 'bold' }}>
                转化率 {processData.subscribeToDealRate}%
              </div>
            </Col>
          </Row>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {processData.sourceStats?.map((s: any) => (
              <Tag key={s.source} color="blue" style={{ padding: '4px 12px' }}>
                {s.source}: {s.count}组
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* 时间范围切换 */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'today', label: '今日' },
            { key: 'week', label: '本周' },
            { key: 'month', label: '本月' },
            { key: 'quarter', label: '本季' },
            { key: 'year', label: '本年' },
          ]}
        />
      </Card>

      {/* 经营数据 */}
      {currentStats && (
        <div style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Card hoverable onClick={() => handleCardClick('newVisit', `新客来访明细`)} style={{ cursor: 'pointer' }}>
                <Statistic
                  title={<><UserOutlined style={{ color: '#1890ff' }} /> 新客来访</>}
                  value={currentStats.customerCount || 0}
                  suffix="组"
                  valueStyle={{ color: '#1890ff' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                  <EyeOutlined /> 点击查看详情
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card hoverable onClick={() => handleCardClick('oldVisit', `老客来访明细`)} style={{ cursor: 'pointer' }}>
                <Statistic
                  title={<><UserOutlined style={{ color: '#722ed1' }} /> 老客来访</>}
                  value={currentStats.oldCustomerCount || 0}
                  suffix="组"
                  valueStyle={{ color: '#722ed1' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                  <EyeOutlined /> 点击查看详情
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card hoverable onClick={() => handleCardClick('subscribe', `认购明细`)} style={{ cursor: 'pointer' }}>
                <Statistic
                  title={<><HomeOutlined style={{ color: '#52c41a' }} /> 认购套数</>}
                  value={currentStats.subscribeCount || 0}
                  suffix="套"
                  valueStyle={{ color: '#52c41a' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                  <EyeOutlined /> 点击查看详情
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card hoverable onClick={() => handleCardClick('deal', `成交明细`)} style={{ cursor: 'pointer' }}>
                <Statistic
                  title={<><FileTextOutlined style={{ color: '#f5222d' }} /> 成交套数</>}
                  value={currentStats.transactionCount || 0}
                  suffix="套"
                  valueStyle={{ color: '#f5222d' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                  <EyeOutlined /> 点击查看详情
                </div>
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Card hoverable onClick={() => handleCardClick('amount', `成交额明细`)} style={{ cursor: 'pointer' }}>
                <Statistic
                  title={<><DollarOutlined style={{ color: '#faad14' }} /> 成交总额</>}
                  value={currentStats.totalAmount || 0}
                  prefix="¥"
                  precision={0}
                  valueStyle={{ color: '#faad14' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                  <EyeOutlined /> 点击查看详情
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="已收款"
                  value={currentStats.paidAmount || 0}
                  prefix="¥"
                  precision={0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="待收款"
                  value={(currentStats.totalAmount || 0) - (currentStats.paidAmount || 0)}
                  prefix="¥"
                  precision={0}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}

      <Row gutter={16}>
        {/* 认购排名 */}
        <Col span={12}>
          <Card
            title={<><TrophyOutlined style={{ color: '#faad14', marginRight: 8 }} />认购排名</>}
            extra={<a onClick={() => navigate('/manager/reports')}>查看更多</a>}
            style={{ marginBottom: 16 }}
          >
            <List
              loading={loading}
              dataSource={rankingData.slice(0, 10)}
              renderItem={(item: any, index: number) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge>
                        <Avatar
                          style={{
                            backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f0f0f0',
                            color: index < 3 ? '#fff' : '#888',
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      </Badge>
                    }
                    title={item.consultantName}
                    description={
                      <Space>
                        <Tag color="blue">认购{item.subscribeCount}套</Tag>
                        <Tag color="green">成交{item.dealCount}套</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 团队业绩 */}
        <Col span={12}>
          <Card
            title={<><TeamOutlined style={{ color: '#1890ff', marginRight: 8 }} />团队业绩</>}
            extra={<a onClick={() => navigate('/manager/reports')}>查看更多</a>}
            style={{ marginBottom: 16 }}
          >
            {teamData && (
              <div style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title="团队成交总额" value={teamData.totalAmount || 0} prefix="¥" precision={0} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="团队成交套数" value={teamData.totalCount || 0} suffix="套" />
                  </Col>
                </Row>
              </div>
            )}
            <List
              loading={loading}
              dataSource={(teamData?.teamList || []).slice(0, 5)}
              renderItem={(item: any) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{item.consultantName}</span>
                      <span>¥{(item.currentAmount / 10000).toFixed(1)}万 / ¥{(item.targetAmount / 10000).toFixed(0)}万</span>
                    </div>
                    <Progress
                      percent={Math.min(Math.round((item.currentAmount / item.targetAmount) * 100), 100)}
                      size="small"
                      strokeColor="#52c41a"
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 楼栋排名 */}
      <Card
        title={<><BankOutlined style={{ color: '#1890ff', marginRight: 8 }} />楼栋排名</>}
        extra={<a onClick={() => navigate('/manager/inventory')}>查看更多</a>}
      >
        <Row gutter={16}>
          {buildingData.map((b: any, index: number) => (
            <Col span={8} key={b.buildingId} style={{ marginBottom: 16 }}>
              <Card size="small" style={{ borderLeft: `3px solid ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#d9d9d9'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold' }}>{b.buildingName}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>{b.complexName}</span>
                </div>
                <Row gutter={8}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>{b.soldRooms}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>已售</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>{b.availableRooms}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>可售</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 'bold' }}>{b.soldRate}%</div>
                      <div style={{ fontSize: 12, color: '#888' }}>去化率</div>
                    </div>
                  </Col>
                </Row>
                <div style={{ marginTop: 8, fontSize: 12, color: '#faad14' }}>
                  成交额: ¥{(b.totalAmount / 10000).toFixed(1)}万
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={detailTitle}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Table
          columns={getDetailColumns()}
          dataSource={detailData}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
