import { useEffect, useState } from 'react';
import { Card, List, Tag, Table, Row, Col, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { channelApi } from '../../services/api';

const AnomalyMonitor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await channelApi.getAnomalies();
      setAnomalies(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const highCount = anomalies.filter((a: any) => a.severity === 'high').length;
  const mediumCount = anomalies.filter((a: any) => a.severity === 'medium').length;

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>
    },
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      render: (no: string) => <a>{no}</a>
    },
    {
      title: '客户',
      dataIndex: ['customer', 'name'],
      key: 'customerName',
      render: (name: string) => <a onClick={() => navigate('/channel/audits')}>{name}</a>
    },
    {
      title: '房源',
      dataIndex: ['room', 'unit'],
      key: 'room',
      render: (unit: string) => <a onClick={() => navigate('/channel/audits')}>{unit}</a>
    },
    { title: '消息', dataIndex: 'message', key: 'message' },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={severity === 'high' ? 'red' : 'orange'}>
          {severity === 'high' ? '高' : '中'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <a onClick={() => navigate('/channel/audits')}>查看详情</a>
      ),
    },
  ];

  return (
    <div>
      <h2>异常交易监控</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card hoverable onClick={() => loadData()}>
            <Statistic
              title="异常总数"
              value={anomalies.length}
              valueStyle={{ color: anomalies.length > 0 ? '#f5222d' : '#52c41a' }}
              prefix={anomalies.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => loadData()}>
            <Statistic
              title="高风险"
              value={highCount}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => navigate('/channel/audits')}>
            <Statistic
              title="待审核佣金"
              value={0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={anomalies}
          rowKey="transactionId"
          loading={loading}
          pagination={false}
          size="small"
        />
        {anomalies.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16, color: '#52c41a' }} />
            <p>暂无异常交易</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AnomalyMonitor;
