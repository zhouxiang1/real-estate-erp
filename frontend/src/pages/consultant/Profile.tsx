import { Card, Descriptions, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/auth';
import PhoneLink from '../../components/PhoneLink';

const Profile = () => {
  const { user } = useAuthStore();

  return (
    <div>
      <h2>个人中心</h2>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar size={80} icon={<UserOutlined />} />
          <h3 style={{ marginTop: 16 }}>{user?.name}</h3>
        </div>
        <Descriptions column={2}>
          <Descriptions.Item label="用户名">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="姓名">{user?.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="电话">{user?.phone ? <PhoneLink phone={user.phone} /> : '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">{user?.role?.name}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default Profile;
