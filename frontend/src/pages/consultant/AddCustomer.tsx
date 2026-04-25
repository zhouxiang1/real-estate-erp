import { useState } from 'react';
import { Form, Input, Button, Card, message, Select, Modal, Divider, Tag, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { customerApi, userApi } from '../../services/api';
import { useEffect } from 'react';

// 安徽省区域数据 - 两级结构
const anhuiAreas = {
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

const cityOptions = Object.keys(anhuiAreas);

// 年龄段选项
const ageGroupOptions = ['18-25岁', '26-30岁', '31-35岁', '36-40岁', '41-50岁', '50岁以上'];

// 行业选项
const industryOptions = [
  'IT/互联网', '金融', '房地产', '制造业', '零售/商贸', '医疗/健康',
  '教育', '建筑/工程', '传媒/广告', '法律', '会计/审计', '咨询',
  '餐饮/旅游', '物流/运输', '政府/事业单位', '自由职业', '其他'
];

// 职业选项
const occupationOptions = [
  '企业主', '企业高管', '公司职员', '公务员', '医生', '教师',
  '律师', '会计', '个体户', '自由职业', '退休人员', '其他'
];

// 婚姻状况选项
const maritalStatusOptions = ['未婚', '已婚', '离异', '丧偶'];

// 贷款方式选项
const loanTypeOptions = ['商业贷款', '公积金贷款', '组合贷款', '全款', '其他'];

const AddCustomer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [duplicateCustomer, setDuplicateCustomer] = useState<any>(null);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [form] = Form.useForm();

  // 加载置业顾问列表
  useEffect(() => {
    loadConsultants();
  }, []);

  const loadConsultants = async () => {
    try {
      const res = await userApi.list({ roleCode: 'sales_consultant' });
      setConsultants(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // 居住区域选择状态
  const [livingCity, setLivingCity] = useState<string>('');
  const [livingAreas, setLivingAreas] = useState<string[]>([]);

  // 工作区域选择状态
  const [workCity, setWorkCity] = useState<string>('');
  const [workAreas, setWorkAreas] = useState<string[]>([]);

  // 居住城市选择变化
  const handleLivingCityChange = (city: string) => {
    setLivingCity(city);
    setLivingAreas([]);
    form.setFieldsValue({ livingArea: [] });
  };

  // 工作城市选择变化
  const handleWorkCityChange = (city: string) => {
    setWorkCity(city);
    setWorkAreas([]);
    form.setFieldsValue({ workArea: [] });
  };

  // 确认选择区域
  const handleAddLivingArea = (area: string) => {
    const current = form.getFieldValue('livingArea') || [];
    if (!current.includes(area)) {
      form.setFieldsValue({ livingArea: [...current, area] });
      setLivingAreas([...livingAreas, area]);
    }
  };

  const handleAddWorkArea = (area: string) => {
    const current = form.getFieldValue('workArea') || [];
    if (!current.includes(area)) {
      form.setFieldsValue({ workArea: [...current, area] });
      setWorkAreas([...workAreas, area]);
    }
  };

  const handleRemoveLivingArea = (area: string) => {
    const current = form.getFieldValue('livingArea') || [];
    form.setFieldsValue({ livingArea: current.filter((a: string) => a !== area) });
    setLivingAreas(livingAreas.filter(a => a !== area));
  };

  const handleRemoveWorkArea = (area: string) => {
    const current = form.getFieldValue('workArea') || [];
    form.setFieldsValue({ workArea: current.filter((a: string) => a !== area) });
    setWorkAreas(workAreas.filter(a => a !== area));
  };

  const handleCheckDuplicate = async () => {
    const phone = form.getFieldValue('phone');
    const name = form.getFieldValue('name');

    if (!phone && !name) {
      message.warning('请输入电话号码或姓名进行查重');
      return;
    }

    setChecking(true);
    try {
      const res = await customerApi.checkDuplicate(phone, name);
      if (res.data.exists && res.data.customer) {
        setDuplicateCustomer(res.data.customer);
      } else {
        message.success('未发现重复客户，可以添加');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChecking(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 提取首次跟进信息
      const { firstFollowupType, firstFollowupContent, ...customerData } = values;

      // 创建客户
      const res = await customerApi.create(customerData);
      const customerId = res.data?.id;

      // 如果有首次跟进记录，同步添加
      if (customerId && firstFollowupType && firstFollowupContent) {
        await customerApi.createFollowup(customerId, {
          type: firstFollowupType,
          content: firstFollowupContent,
        });
      }

      message.success('客户创建成功');
      form.resetFields();
      navigate('/consultant/customers');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || '';
      if (errorMsg.includes('已存在') || errorMsg.includes('手机号已存在')) {
        message.error('该手机号已存在，不能重复添加');
      } else {
        message.error(errorMsg || '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>客户录入</h2>
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
              <Form.Item
                name="phone"
                label="电话"
                rules={[
                  { required: true, message: '请输入客户电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
                  {
                    validator: async (_, value) => {
                      if (value && value.length === 11) {
                        try {
                          const res = await customerApi.checkDuplicate(value, undefined);
                          if (res.data.exists) {
                            return Promise.reject('该手机号已存在，不能重复添加');
                          }
                        } catch (e) {
                          // ignore error
                        }
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input placeholder="请输入客户电话" onBlur={() => {
                  // 自动触发查重
                  const phone = form.getFieldValue('phone');
                  if (phone && phone.length === 11) {
                    customerApi.checkDuplicate(phone).then((res: any) => {
                      if (res.data.exists && res.data.customer) {
                        setDuplicateCustomer(res.data.customer);
                      }
                    }).catch(() => {});
                  }
                }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button
              type="default"
              onClick={handleCheckDuplicate}
              loading={checking}
            >
              查重检查
            </Button>
          </Form.Item>

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

          {/* 居住区域 - 两级联动选择 */}
          <Form.Item label="居住区域">
            <Row gutter={8}>
              <Col span={8}>
                <Select
                  placeholder="选择城市"
                  value={livingCity}
                  onChange={handleLivingCityChange}
                  options={cityOptions.map(v => ({ label: v, value: v }))}
                  allowClear
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={16}>
                {livingCity && anhuiAreas[livingCity as keyof typeof anhuiAreas] && (
                  <div style={{ maxHeight: 100, overflow: 'auto' }}>
                    <Form.Item name="livingArea" noStyle>
                      <Select
                                                placeholder="选择区县(可多选)"
                        options={anhuiAreas[livingCity as keyof typeof anhuiAreas].map(v => ({ label: v, value: v }))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </div>
                )}
                {livingCity === '外地' && (
                  <Form.Item name="livingArea" noStyle>
                    <Input placeholder="请输入外地地址" />
                  </Form.Item>
                )}
              </Col>
            </Row>
          </Form.Item>

          {/* 工作区域 - 两级联动选择 */}
          <Form.Item label="工作区域">
            <Row gutter={8}>
              <Col span={8}>
                <Select
                  placeholder="选择城市"
                  value={workCity}
                  onChange={handleWorkCityChange}
                  options={cityOptions.map(v => ({ label: v, value: v }))}
                  allowClear
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={16}>
                {workCity && anhuiAreas[workCity as keyof typeof anhuiAreas] && (
                  <div style={{ maxHeight: 100, overflow: 'auto' }}>
                    <Form.Item name="workArea" noStyle>
                      <Select
                                                placeholder="选择区县(可多选)"
                        options={anhuiAreas[workCity as keyof typeof anhuiAreas].map(v => ({ label: v, value: v }))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </div>
                )}
                {workCity === '外地' && (
                  <Form.Item name="workArea" noStyle>
                    <Input placeholder="请输入外地地址" />
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
                <Select
                  placeholder="请选择客户来源"
                  options={[
                    { label: '自然到访', value: '自然到访' },
                    { label: '电话咨询', value: '电话咨询' },
                    { label: '网络推广', value: '网络推广' },
                    { label: '老客户推荐', value: '老客户推荐' },
                    { label: '分销推荐', value: '分销推荐' },
                    { label: '渠道推荐', value: '渠道推荐' },
                    { label: '其他', value: '其他' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="客户状态" rules={[{ required: true }]}>
                <Select
                  placeholder="请选择客户状态"
                  onChange={(value) => {
                    // 状态与等级挂钩：潜在=C类，意向=B类，成交=A类
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

          <Divider>首次跟进记录（可选）</Divider>

          <Form.Item name="firstFollowupType" label="跟进方式">
            <Select
              placeholder="选择跟进方式"
              options={[
                { label: '电话', value: 'call' },
                { label: '上门', value: 'visit' },
                { label: '微信', value: 'wechat' },
                { label: '其他', value: 'other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="firstFollowupContent" label="跟进内容">
            <Input.TextArea rows={2} placeholder="首次跟进内容..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 重复客户提示弹窗 */}
      <Modal
        title="发现重复客户"
        open={!!duplicateCustomer}
        onOk={() => {
          if (duplicateCustomer) {
            navigate(`/consultant/customers`);
          }
          setDuplicateCustomer(null);
        }}
        onCancel={() => setDuplicateCustomer(null)}
        okText="查看现有客户"
        cancelText="继续添加"
      >
        {duplicateCustomer && (
          <div>
            <p>系统中已存在相似客户：</p>
            <p><strong>姓名：</strong>{duplicateCustomer.name}</p>
            <p><strong>电话：</strong>{duplicateCustomer.phone}</p>
            <p><strong>状态：</strong>
              {duplicateCustomer.status === 0 ? '潜在客户' :
               duplicateCustomer.status === 1 ? '意向客户' : '成交客户'}
            </p>
            <p style={{ color: '#ff4d4f', marginTop: 16 }}>
              建议查看现有客户记录，避免重复录入
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AddCustomer;
