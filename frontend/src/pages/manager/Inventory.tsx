import { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Select, Tag, Modal, Descriptions, Empty, Statistic } from 'antd';
import { projectApi } from '../../services/api';
import {
  calculateRoomStats,
  EMPTY_ROOM_STATS,
  groupRoomsByFloor,
  ROOM_STATUS_COLORS,
  ROOM_STATUS_META,
  ROOM_STATUS_TEXT_COLORS,
} from '../../utils/roomStats';

const Inventory = () => {
  const [complexes, setComplexes] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildingStats, setBuildingStats] = useState(EMPTY_ROOM_STATS);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const roomsByFloor = useMemo(() => groupRoomsByFloor(rooms), [rooms]);


  async function loadComplexes() {
    try {
      const res = await projectApi.listComplex({ limit: 100 });
      setComplexes(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedComplex(res.data.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadBuildings(complexId: string) {
    try {
      const res = await projectApi.listBuildings(complexId);
      setBuildings(res.data);
      if (res.data.length > 0) {
        setSelectedBuilding(res.data[0].id);
      } else {
        setSelectedBuilding('');
        setRooms([]);
        setBuildingStats(EMPTY_ROOM_STATS);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadRooms(buildingId: string) {
    try {
      const res = await projectApi.listRooms({ buildingId, limit: 500 });
      const roomList = res.data.data || [];
      setRooms(roomList);
      setBuildingStats(calculateRoomStats(roomList, 2));
    } catch (error) {
      console.error(error);
    }
  }
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
    }
  }, [selectedBuilding]);

  const handleRoomClick = (room: any) => {
    setSelectedRoom(room);
    setRoomModalVisible(true);
  };

  const currentBuilding = buildings.find(b => b.id === selectedBuilding);

  // 渲染房源卡片网格
  const renderRoomGrid = () => {
    if (rooms.length === 0) {
      return <Empty description="暂无房源数据" />;
    }

    return (
      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {roomsByFloor.map(({ floor, rooms: floorRooms }) => {
          return (
            <div key={floor} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#666' }}>{floor}层</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {floorRooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    style={{
                      width: 80,
                      height: 60,
                      backgroundColor: ROOM_STATUS_COLORS[room.status] || '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: ROOM_STATUS_TEXT_COLORS[room.status] || '#000',
                      fontSize: 12,
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
      <h2>销控管理</h2>

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
              <Tag color={ROOM_STATUS_META[selectedRoom.status]?.color}>
                {ROOM_STATUS_META[selectedRoom.status]?.text}
              </Tag>
            </Descriptions.Item>
            {selectedRoom.customerName && (
              <>
                <Descriptions.Item label="客户姓名">{selectedRoom.customerName}</Descriptions.Item>
                <Descriptions.Item label="跟进人">{selectedRoom.followerName || '-'}</Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;
