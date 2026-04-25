import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import { projectApi, transactionApi } from '../../services/api';

const OfficeDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    complexes: 0,
    buildings: 0,
    rooms: 0,
    soldRooms: 0,
    transactions: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [complexRes, txRes] = await Promise.all([
        projectApi.listComplex({ limit: 100 }),
        transactionApi.getStats(),
      ]);

      // 获取所有楼栋数量
      let totalBuildings = 0;
      if (complexRes.data.data?.length > 0) {
        const buildingPromises = complexRes.data.data.map((c: any) =>
          projectApi.listBuildings(c.id).then(res => res.data?.length || 0)
        );
        const buildingCounts = await Promise.all(buildingPromises);
        totalBuildings = buildingCounts.reduce((sum, count) => sum + count, 0);
      }

      setStats({
        complexes: complexRes.data.data?.length || 0,
        buildings: totalBuildings,
        rooms: 0, // 需要通过楼栋累加，暂时显示0
        soldRooms: txRes.data.count || 0, // 使用成交数作为已售
        transactions: txRes.data.count || 0,
        totalAmount: txRes.data.totalAmount || 0,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>内勤数据看板</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/office/projects')}>
            <Statistic title="楼盘数量" value={stats.complexes} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/office/buildings')}>
            <Statistic title="楼栋数量" value={stats.buildings} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/office/rooms')}>
            <Statistic title="房间总数" value={stats.rooms} />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/office/sales')}>
            <Statistic title="已售房间" value={stats.soldRooms} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card hoverable onClick={() => navigate('/office/sales')}>
            <Statistic title="成交套数" value={stats.transactions} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card hoverable>
            <Statistic title="成交总额" value={stats.totalAmount} prefix="¥" precision={0} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OfficeDashboard;
