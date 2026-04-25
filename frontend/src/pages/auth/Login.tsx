import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, getHomePath } from '../../store/auth';
import RoleSwitcher from '../../components/RoleSwitcher';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login, user, token } = useAuthStore();
  const navigate = useNavigate();

  // 如果已经登录，跳转到首页
  useEffect(() => {
    if (token && user && user.role) {
      navigate(getHomePath(user.role.code), { replace: true });
    }
  }, [token, user, navigate]);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      // 登录成功后不需要手动跳转，useEffect会处理
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <RoleSwitcher />
      </div>
      <Card
        title={<h2 style={{ textAlign: 'center', margin: 0 }}>明源云客ERP</h2>}
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
            <p>地产营销 ERP 测试环境</p>
            <p>请使用管理员分配的岗位账号登录</p>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
