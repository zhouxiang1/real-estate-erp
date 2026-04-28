export interface RoomLite {
  id: string;
  unit: string;
  floor: number;
  area?: number | null;
  status: number;
  [key: string]: unknown;
}

export interface RoomStats {
  total: number;
  sold: number;
  reserved: number;
  available: number;
  areaRange: string;
}

export const EMPTY_ROOM_STATS: RoomStats = {
  total: 0,
  sold: 0,
  reserved: 0,
  available: 0,
  areaRange: '-',
};

export const ROOM_STATUS_COLORS: Record<number, string> = {
  0: '#ffffff',
  1: '#ff4d4f',
  2: '#faad14',
  3: '#52c41a',
  4: '#1890ff',
};

export const ROOM_STATUS_TEXT_COLORS: Record<number, string> = {
  0: '#000000',
  1: '#ffffff',
  2: '#000000',
  3: '#ffffff',
  4: '#ffffff',
};

export const ROOM_STATUS_META: Record<number, { color: string; text: string }> = {
  0: { color: '#ffffff', text: '待售' },
  1: { color: '#ff4d4f', text: '已售' },
  2: { color: '#faad14', text: '预留' },
  3: { color: '#52c41a', text: '认购' },
  4: { color: '#1890ff', text: '已签' },
};

export const calculateRoomStats = (rooms: RoomLite[], areaPrecision = 1): RoomStats => {
  if (!rooms.length) {
    return EMPTY_ROOM_STATS;
  }

  let sold = 0;
  let reserved = 0;
  let available = 0;
  let minArea = Number.POSITIVE_INFINITY;
  let maxArea = 0;

  for (const room of rooms) {
    if (room.status === 1) sold += 1;
    if (room.status === 2) reserved += 1;
    if (room.status === 0) available += 1;

    const area = Number(room.area || 0);
    if (area > 0) {
      minArea = Math.min(minArea, area);
      maxArea = Math.max(maxArea, area);
    }
  }

  return {
    total: rooms.length,
    sold,
    reserved,
    available,
    areaRange: Number.isFinite(minArea) && maxArea > 0
      ? `${minArea.toFixed(areaPrecision)}-${maxArea.toFixed(areaPrecision)}`
      : '-',
  };
};

export const groupRoomsByFloor = (rooms: RoomLite[]) => {
  const groups = new Map<number, RoomLite[]>();

  for (const room of rooms) {
    const floorRooms = groups.get(room.floor);
    if (floorRooms) {
      floorRooms.push(room);
    } else {
      groups.set(room.floor, [room]);
    }
  }

  return [...groups.entries()]
    .sort(([floorA], [floorB]) => floorB - floorA)
    .map(([floor, floorRooms]) => ({ floor, rooms: floorRooms }));
};
