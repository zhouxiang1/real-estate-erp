import { Button } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';

interface PhoneLinkProps {
  phone: string;
  showIcon?: boolean;
}

const PhoneLink: React.FC<PhoneLinkProps> = ({ phone, showIcon = true }) => {
  if (!phone) return '-';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <Button
      type="link"
      size="small"
      onClick={handleClick}
      style={{ padding: '0 4px' }}
    >
      {showIcon && <PhoneOutlined />} {phone}
    </Button>
  );
};

export default PhoneLink;
