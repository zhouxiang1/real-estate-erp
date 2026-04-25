import { Card, Statistic } from 'antd';

const AdminDashboard = () => {
  return (
    <div>
      <h2>系统管理后台</h2>
      <Card>
        <Statistic title="系统运行正常" value="OK" />
      </Card>
    </div>
  );
};

export default AdminDashboard;
