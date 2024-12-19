import { useIntl } from '@umijs/max';
import { Divider, Menu, Space } from 'antd';
import styles from './ChannelList.less';

interface ChannelListProps {
  accounts: any[];
  curAccount?: string;
  onAccountChange: (account: any) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({ accounts, curAccount, onAccountChange }) => {
  const intl = useIntl();

  return (
    <div style={{ padding: '8px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Menu
          mode="inline"
          selectedKeys={curAccount ? [curAccount] : ['']}
          defaultSelectedKeys={['']}
          onClick={({ key }) => onAccountChange(key)}
          className={styles.channelMenu}
          style={{
            border: 'none',
          }}
        >
          <Menu.Item key="">{intl.formatMessage({ id: 'pages.draw2.randomChannel' })}</Menu.Item>
          <Divider style={{ margin: '8px 0' }} />

          {accounts.map((account, index) => (
            <>
              <Menu.Item
                key={account.channelId}
                style={{
                  margin: '4px 0',
                  borderRadius: '6px',
                  transition: 'all 0.3s',
                }}
              >
                <div
                  style={{
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: account.running ? '#52c41a' : '#ff4d4f',
                      marginTop: '6px',
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', lineHeight: '20px' }}>
                      {account.channelId}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#999',
                        minHeight: '16px',
                      }}
                    >
                      {account.remark || ' '}
                    </span>
                  </div>
                </div>
              </Menu.Item>
              <Divider style={{ margin: '8px 0' }} />
            </>
          ))}
        </Menu>
      </Space>
    </div>
  );
};

export default ChannelList;
