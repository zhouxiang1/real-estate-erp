import { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Select, Tag, Modal, Descriptions, message, Empty, Statistic, Button, Space, Form, Input, InputNumber } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { projectApi } from '../../services/api';
import {
  calculateRoomStats,
  EMPTY_ROOM_STATS,
  groupRoomsByFloor,
  ROOM_STATUS_COLORS,
  ROOM_STATUS_META,
  ROOM_STATUS_TEXT_COLORS,
} from '../../utils/roomStats';

const OfficeRooms = () => {
  const [complexes, setComplexes] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildingStats, setBuildingStats] = useState(EMPTY_ROOM_STATS);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchForm] = Form.useForm();
  const roomsByFloor = useMemo(() => groupRoomsByFloor(rooms), [rooms]);


  async function loadComplexes() {
    try {
      const res = await projectApi.listComplex({ limit: 100 });
      setComplexes(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedComplex(res.data.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadBuildings(complexId: string) {
    try {
      const res = await projectApi.listBuildings(complexId);
      setBuildings(res.data || []);
      if (res.data?.length > 0) {
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
      setBuildingStats(calculateRoomStats(roomList));
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

  const handleBatchCreate = async () => {
    try {
      const values = await batchForm.validateFields();
      const rooms = [];

      for (let floor = values.startFloor; floor <= values.endFloor; floor++) {
        for (let unit = 1; unit <= values.unitsPerFloor; unit++) {
          const unitStr = String(unit).padStart(2, '0');
          rooms.push({
            buildingId: selectedBuilding,
            unit: `${floor}0${unitStr}`,
            floor,
            area: values.area,
            price: values.price,
            totalPrice: values.area * values.price,
            roomType: values.roomType || '3室2厅',
            status: 0,
          });
        }
      }

      await projectApi.createRoomsBatch(rooms);
      message.success(`成功创建${rooms.length}个房间`);
      setBatchModalVisible(false);
      batchForm.resetFields();
      loadRooms(selectedBuilding);
    } catch {
      message.error('批量创建失败');
    }
  };

  const currentBuilding = buildings.find(b => b.id === selectedBuilding);

  // 渲染房源卡片网格
  const renderRoomGrid = () => {
    if (rooms.length === 0) {
      return <Empty description="暂无房源数据" />;
    }

    return (
      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
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
                      width: 70,
                      height: 55,
                      backgroundColor: ROOM_STATUS_COLORS[room.status] || '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: ROOM_STATUS_TEXT_COLORS[room.status] || '#000',
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>房源管理</h2>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setBatchModalVisible(true)} disabled={!selectedBuilding}>
            批量创建
          </Button>
        </Space>
      </div>

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
          </Descriptions>
        )}
      </Modal>

      {/* 批量创建弹窗 */}
      <Modal
        title="批量创建房间"
        open={batchModalVisible}
        onOk={handleBatchCreate}
        onCancel={() => setBatchModalVisible(false)}
      >
        <Form form={batchForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startFloor" label="起始楼层" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="如: 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endFloor" label="结束楼层" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="如: 30" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="unitsPerFloor" label="每层户数" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="如: 4" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="area" label="面积(m²)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="如: 120" step={0.01} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="单价(元/m²)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="如: 15000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roomType" label="户型">
                <Input placeholder="如: 3室2厅" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default OfficeRooms;
