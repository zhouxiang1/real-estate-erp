import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { commissionApi, channelApi } from '../../services/api';

const ChannelDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [commissionStats, setCommissionStats] = useState<any>({});
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [commRes, anomalyRes] = await Promise.all([
        commissionApi.getStats(),
        channelApi.getAnomalies(),
      ]);
      setCommissionStats(commRes.data);
      setAnomalies(anomalyRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>渠道风控看板</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/channel/audits')}>
            <Statistic
              title="待审核佣金"
              value={commissionStats.pending?.count || 0}
              suffix={`¥${(commissionStats.pending?.amount || 0).toLocaleString()}`}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/channel/audits')}>
            <Statistic
              title="待发放佣金"
              value={commissionStats.approved?.count || 0}
              suffix={`¥${(commissionStats.approved?.amount || 0).toLocaleString()}`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="已发放佣金"
              value={commissionStats.paid?.count || 0}
              suffix={`¥${(commissionStats.paid?.amount || 0).toLocaleString()}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/channel/anomalies')}>
            <Statistic
              title="异常交易"
              value={anomalies.length || 0}
              valueStyle={{ color: anomalies.length > 0 ? 'red' : 'green' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            title="最近异常"
            hoverable
            onClick={() => navigate('/channel/anomalies')}
            extra={<a>查看全部</a>}
          >
            <List
              itemLayout="horizontal"
              dataSource={anomalies.slice(0, 5)}
              renderItem={(item: any) => (
                <List.Item style={{ cursor: 'pointer' }}>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color={item.severity === 'high' ? 'red' : 'orange'}>{item.type}</Tag>
                        <span>{item.message}</span>
                      </Space>
                    }
                    description={item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                  />
                </List.Item>
              )}
            />
            {anomalies.length === 0 && <div style={{ textAlign: 'center', color: '#888' }}>暂无异常</div>}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="待审核佣金"
            hoverable
            onClick={() => navigate('/channel/audits')}
            extra={<a>查看全部</a>}
          >
            <List
              itemLayout="horizontal"
              dataSource={[]}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.contractNo}
                    description={`¥${item.amount?.toLocaleString()}`}
                  />
                </List.Item>
              )}
            />
            <div style={{ textAlign: 'center', color: '#888' }}>
              待审核: {commissionStats.pending?.count || 0} 笔
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ChannelDashboard;
