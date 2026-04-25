import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Select, Divider, Row, Col, Alert, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { customerApi, userApi } from '../../services/api';
import dayjs from 'dayjs';

const anhuiAreas: Record<string, string[]> = {
  '合肥市': ['瑶海区', '庐阳区', '蜀山区', '包河区', '长丰县', '肥东县', '肥西县', '庐江县', '巢湖市'],
  '芜湖市': ['镜湖区', '弋江区', '鸠江区', '三山区', '芜湖县', '繁昌县', '南陵县', '无为市'],
  '蚌埠市': ['龙子湖区', '蚌山区', '禹会区', '淮上区', '怀远县', '五河县', '固镇县'],
  '淮南市': ['大通区', '田家庵区', '谢家集区', '八公山区', '潘集区', '凤台县', '寿县'],
  '马鞍山市': ['花山区', '雨山区', '博望区', '当涂县', '含山县', '和县'],
  '淮北市': ['杜集区', '相山区', '烈山区', '濉溪县'],
  '铜陵市': ['铜官区', '义安区', '郊区', '枞阳县'],
  '安庆市': ['迎江区', '大观区', '宜秀区', '怀宁县', '潜山市', '太湖县', '宿松县', '望江县', '岳西县', '桐城市'],
  '黄山市': ['屯溪区', '黄山区', '徽州区', '歙县', '休宁县', '黟县', '祁门县'],
  '滁州市': ['琅琊区', '南谯区', '来安县', '全椒县', '定远县', '凤阳县', '天长市', '明光市'],
  '阜阳市': ['颍州区', '颍东区', '颍泉区', '临泉县', '太和县', '阜南县', '颍上县', '界首市'],
  '宿州市': ['埇桥区', '砀山县', '萧县', '灵璧县', '泗县'],
  '六安市': ['金安区', '裕安区', '叶集区', '霍邱县', '舒城县', '金寨县', '霍山县'],
  '亳州市': ['谯城区', '涡阳县', '蒙城县', '利辛县'],
  '池州市': ['贵池区', '东至县', '石台县', '青阳县'],
  '宣城市': ['宣州区', '郎溪县', '泾县', '绩溪县', '旌德县', '宁国市', '广德市'],
};

const ageGroupOptions = ['18-25岁', '26-30岁', '31-35岁', '36-40岁', '41-50岁', '50岁以上'];
const industryOptions = ['IT/互联网', '金融', '房地产', '制造业', '零售/商贸', '医疗/健康', '教育', '建筑/工程', '政府/事业单位', '自由职业', '其他'];
const occupationOptions = ['企业主', '企业高管', '公司职员', '公务员', '医生', '教师', '律师', '会计', '个体户', '自由职业', '退休人员', '其他'];
const maritalStatusOptions = ['未婚', '已婚', '离异', '丧偶'];
const loanTypeOptions = ['商业贷款', '公积金贷款', '组合贷款', '全款', '其他'];

const EditCustomer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [customerId, setCustomerId] = useState<string | null>(null);

  // 区域状态
  const [livingCity, setLivingCity] = useState<string>('');
  const [workCity, setWorkCity] = useState<string>('');

  useEffect(() => {
    // 获取客户ID
    const customer = location.state?.customer;
    if (customer?.id) {
      setCustomerId(customer.id);
      // 加载客户数据
      loadCustomerData(customer.id);
    }
    loadConsultants();
  }, []);

  const loadCustomerData = async (id: string) => {
    try {
      const res = await customerApi.get(id);
      const customer = res.data;

      // 处理区域数据（如果存储的是完整地址字符串）
      let livingAreaValue = customer.livingArea;
      let workAreaValue = customer.workArea;

      // 尝试解析 livingArea
      if (customer.livingArea) {
        if (typeof customer.livingArea === 'string') {
          // 尝试找出对应的城市
          for (const [city, areas] of Object.entries(anhuiAreas)) {
            if (areas.some(a => customer.livingArea.includes(a))) {
              setLivingCity(city);
              break;
            }
          }
        }
      }

      // 尝试解析 workArea
      if (customer.workArea) {
        if (typeof customer.workArea === 'string') {
          for (const [city, areas] of Object.entries(anhuiAreas)) {
            if (areas.some(a => customer.workArea.includes(a))) {
              setWorkCity(city);
              break;
            }
          }
        }
      }

      // 设置表单数据
      form.setFieldsValue({
        name: customer.name,
        phone: customer.phone,
        idCard: customer.idCard,
        wechat: customer.wechat,
        address: customer.address,
        ageGroup: customer.ageGroup,
        maritalStatus: customer.maritalStatus,
        industry: customer.industry,
        occupation: customer.occupation,
        livingArea: livingAreaValue,
        workArea: workAreaValue,
        loanType: customer.loanType,
        source: customer.source,
        status: customer.status,
        level: customer.level,
        consultantId: customer.consultantId,
        remark: customer.remark,
      });
    } catch (error) {
      console.error(error);
      message.error('加载客户数据失败');
    }
  };

  const loadConsultants = async () => {
    try {
      const res = await userApi.list({ roleCode: 'sales_consultant' });
      setConsultants(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLivingCityChange = (city: string) => {
    setLivingCity(city);
    form.setFieldsValue({ livingArea: [] });
  };

  const handleWorkCityChange = (city: string) => {
    setWorkCity(city);
    form.setFieldsValue({ workArea: [] });
  };

  const onFinish = async (values: any) => {
    if (!customerId) {
      message.error('客户ID不存在');
      return;
    }

    setLoading(true);
    try {
      await customerApi.update(customerId, values);
      message.success('客户信息更新成功');
      navigate('/consultant/customers');
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>编辑客户</h2>
      <Alert
        message="提示"
        description="客户手机号一旦录入不可修改，如需变更请联系管理员。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Divider orientation="left">基本信息</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入客户姓名' }]}
              >
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="电话">
                <Input value={form.getFieldValue('phone')} disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="idCard" label="身份证号">
                <Input placeholder="请输入身份证号(选填)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="wechat" label="微信">
                <Input placeholder="请输入微信号(选填)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="通讯地址">
            <Input placeholder="请输入详细地址(选填)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ageGroup" label="年龄段">
                <Select placeholder="请选择年龄段" options={ageGroupOptions.map(v => ({ label: v, value: v }))} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maritalStatus" label="婚姻状况">
                <Select placeholder="请选择婚姻状况" options={maritalStatusOptions.map(v => ({ label: v, value: v }))} allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="industry" label="所属行业">
                <Select placeholder="请选择所属行业" options={industryOptions.map(v => ({ label: v, value: v }))} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="occupation" label="职业">
                <Select placeholder="请选择职业" options={occupationOptions.map(v => ({ label: v, value: v }))} allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="居住区域">
            <Row gutter={8}>
              <Col span={8}>
                <Select
                  placeholder="选择城市"
                  value={livingCity}
                  onChange={handleLivingCityChange}
                  options={Object.keys(anhuiAreas).map(v => ({ label: v, value: v }))}
                  allowClear
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={16}>
                {livingCity && anhuiAreas[livingCity] && (
                  <Form.Item name="livingArea" noStyle>
                    <Select
                      placeholder="选择区县(可多选)"
                      options={anhuiAreas[livingCity].map(v => ({ label: v, value: v }))}
                      style={{ width: '100%' }}
                      mode="multiple"
                    />
                  </Form.Item>
                )}
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="工作区域">
            <Row gutter={8}>
              <Col span={8}>
                <Select
                  placeholder="选择城市"
                  value={workCity}
                  onChange={handleWorkCityChange}
                  options={Object.keys(anhuiAreas).map(v => ({ label: v, value: v }))}
                  allowClear
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={16}>
                {workCity && anhuiAreas[workCity] && (
                  <Form.Item name="workArea" noStyle>
                    <Select
                      placeholder="选择区县(可多选)"
                      options={anhuiAreas[workCity].map(v => ({ label: v, value: v }))}
                      style={{ width: '100%' }}
                      mode="multiple"
                    />
                  </Form.Item>
                )}
              </Col>
            </Row>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="loanType" label="贷款方式">
                <Select placeholder="请选择贷款方式" options={loanTypeOptions.map(v => ({ label: v, value: v }))} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source" label="客户来源">
                <Select placeholder="请选择客户来源" options={[
                  { label: '自然到访', value: '自然到访' },
                  { label: '电话咨询', value: '电话咨询' },
                  { label: '网络推广', value: '网络推广' },
                  { label: '老客户推荐', value: '老客户推荐' },
                  { label: '分销推荐', value: '分销推荐' },
                  { label: '渠道推荐', value: '渠道推荐' },
                  { label: '其他', value: '其他' },
                ]} allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="客户状态">
                <Select
                  placeholder="请选择客户状态"
                  onChange={(value) => {
                    const levelMap: Record<number, string> = { 0: 'C类', 1: 'B类', 2: 'A类' };
                    form.setFieldsValue({ level: levelMap[value] });
                  }}
                  options={[
                    { label: '潜在客户', value: 0 },
                    { label: '意向客户', value: 1 },
                    { label: '成交客户', value: 2 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="客户等级">
                <Select
                  placeholder="选择状态后自动匹配"
                  options={[
                    { label: 'A类-高意向(成交)', value: 'A类' },
                    { label: 'B类-中意向(意向)', value: 'B类' },
                    { label: 'C类-低意向(潜在)', value: 'C类' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="consultantId" label="置业顾问">
                <Select
                  placeholder="请选择置业顾问"
                  options={consultants.map(c => ({ label: c.name, value: c.id }))}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注信息(选填)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
              <Button onClick={() => navigate('/consultant/customers')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EditCustomer;
