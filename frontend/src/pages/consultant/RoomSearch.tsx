import { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Tag, Modal, Descriptions, Empty, Statistic, message } from 'antd';
import { projectApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';

const RoomSearch = () => {
  const { user } = useAuthStore();
  const [complexes, setComplexes] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildingStats, setBuildingStats] = useState<any>({});
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  useEffect(() => {
    loadComplexes();
  }, []);

  useEffect(() => {
    if (selectedComplex) {
      loadBuildings(selectedComplex);
    }
  }, [selectedComplex]);

  useEffect(() => {
    if (selectedBuilding) {
      loadRooms(selectedBuilding);
      loadBuildingStats(selectedBuilding);
    }
  }, [selectedBuilding]);

  const loadComplexes = async () => {
    try {
      const res = await projectApi.listComplex({ limit: 100 });
      setComplexes(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedComplex(res.data.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadBuildings = async (complexId: string) => {
    try {
      const res = await projectApi.listBuildings(complexId);
      setBuildings(res.data);
      if (res.data.length > 0) {
        setSelectedBuilding(res.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadRooms = async (buildingId: string) => {
    try {
      const res = await projectApi.listRooms({ buildingId, limit: 500 });
      setRooms(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadBuildingStats = async (buildingId: string) => {
    try {
      const res = await projectApi.listRooms({ buildingId, limit: 500 });
      const roomList = res.data.data || [];

      const total = roomList.length;
      const sold = roomList.filter((r: any) => r.status === 1).length;
      const reserved = roomList.filter((r: any) => r.status === 2).length;
      const available = roomList.filter((r: any) => r.status === 0).length;

      // 计算面积区间
      const areas = roomList.map((r: any) => r.area).filter(Boolean);
      const minArea = areas.length > 0 ? Math.min(...areas) : 0;
      const maxArea = areas.length > 0 ? Math.max(...areas) : 0;

      setBuildingStats({
        total,
        sold,
        reserved,
        available,
        areaRange: minArea && maxArea ? `${minArea.toFixed(1)}-${maxArea.toFixed(1)}` : '-',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoomClick = async (room: any) => {
    // 如果不是待售房源，需要检查是否有权限查看
    if (room.status !== 0) {
      try {
        // 调用API检查权限
        await projectApi.getRoom(room.id);
        // 有权限，显示详情
        setSelectedRoom(room);
        setRoomModalVisible(true);
      } catch (error: any) {
        // 无权限，显示提示
        if (error.response?.status === 404) {
          message.warning('该房源已售出，无法查看详细信息');
        } else {
          message.error('获取房源信息失败');
        }
      }
    } else {
      // 待售房源直接显示
      setSelectedRoom(room);
      setRoomModalVisible(true);
    }
  };

  // 状态颜色映射
  const statusColors: Record<number, string> = {
    0: '#ffffff',
    1: '#ff4d4f',
    2: '#faad14',
    3: '#52c41a',
    4: '#1890ff',
  };

  const statusTextColors: Record<number, string> = {
    0: '#000000',
    1: '#ffffff',
    2: '#000000',
    3: '#ffffff',
    4: '#ffffff',
  };

  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: '#ffffff', text: '待售' },
    1: { color: '#ff4d4f', text: '已售' },
    2: { color: '#faad14', text: '预留' },
    3: { color: '#52c41a', text: '认购' },
    4: { color: '#1890ff', text: '已签' },
  };

  const currentBuilding = buildings.find(b => b.id === selectedBuilding);

  // 渲染房源卡片网格
  const renderRoomGrid = () => {
    if (rooms.length === 0) {
      return <Empty description="暂无房源数据" />;
    }

    // 按楼层分组，每层一个row
    const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => b - a);

    return (
      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        {floors.map(floor => {
          const floorRooms = rooms.filter(r => r.floor === floor);
          return (
            <div key={floor} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#666' }}>{floor}层</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {floorRooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    style={{
                      width: 70,
                      height: 55,
                      backgroundColor: statusColors[room.status] || '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: statusTextColors[room.status] || '#000',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{room.unit}</div>
                    <div>{room.area?.toFixed(1)}㎡</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h2>房源查询</h2>

      {/* 楼盘选择 */}
      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 200 }}
          placeholder="选择楼盘"
          value={selectedComplex}
          onChange={setSelectedComplex}
          options={complexes.map(c => ({ label: c.name, value: c.id }))}
        />
      </div>

      <Row gutter={16}>
        {/* 左侧：楼栋列表 */}
        <Col xs={24} md={6}>
          <Card title="楼栋列表" size="small" bodyStyle={{ padding: 0 }}>
            {buildings.map(building => (
              <div
                key={building.id}
                onClick={() => setSelectedBuilding(building.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: building.id === selectedBuilding ? '#e6f7ff' : 'transparent',
                  borderLeft: building.id === selectedBuilding ? '3px solid #1890ff' : '3px solid transparent',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{building.name}</div>
              </div>
            ))}
          </Card>
        </Col>

        {/* 右侧：房源信息 */}
        <Col xs={24} md={18}>
          {/* 楼栋统计信息 */}
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col span={4}>
                <Statistic title="楼栋" value={currentBuilding?.name || '-'} />
              </Col>
              <Col span={4}>
                <Statistic title="总套数" value={buildingStats.total || 0} />
              </Col>
              <Col span={4}>
                <Statistic title="已售" value={buildingStats.sold || 0} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
              <Col span={4}>
                <Statistic title="待售" value={buildingStats.available || 0} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={4}>
                <Statistic title="面积区间" value={buildingStats.areaRange || '-'} />
              </Col>
              <Col span={4}>
                <div>
                  <Tag color="#52c41a" style={{ marginBottom: 4 }}>待售</Tag>
                  <Tag color="#ff4d4f" style={{ marginBottom: 4 }}>已售</Tag>
                  <Tag color="#faad14" style={{ marginBottom: 4 }}>预留</Tag>
                  <Tag color="#52c41a">认购</Tag>
                  <Tag color="#1890ff">已签</Tag>
                </div>
              </Col>
            </Row>
          </Card>

          {/* 房源网格 */}
          <Card title={`${currentBuilding?.name || ''} 房源表`}>
            {renderRoomGrid()}
          </Card>
        </Col>
      </Row>

      {/* 房源详情弹窗 */}
      <Modal
        title={`${selectedRoom?.building?.name || ''} - ${selectedRoom?.unit || ''}`}
        open={roomModalVisible}
        onCancel={() => setRoomModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedRoom && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="楼栋">{selectedRoom.building?.name}</Descriptions.Item>
            <Descriptions.Item label="房号">{selectedRoom.unit}</Descriptions.Item>
            <Descriptions.Item label="楼层">{selectedRoom.floor}</Descriptions.Item>
            <Descriptions.Item label="户型">{selectedRoom.roomType || '-'}</Descriptions.Item>
            <Descriptions.Item label="面积">{selectedRoom.area}㎡</Descriptions.Item>
            <Descriptions.Item label="单价">¥{selectedRoom.price?.toLocaleString()}/㎡</Descriptions.Item>
            <Descriptions.Item label="总价">¥{selectedRoom.totalPrice?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="朝向">{selectedRoom.direction || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              <Tag color={statusMap[selectedRoom.status]?.color}>
                {statusMap[selectedRoom.status]?.text}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default RoomSearch;
