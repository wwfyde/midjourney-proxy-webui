import { Menu, Space } from 'antd';

interface ChannelListProps {
  accounts: any[];
  curAccount?: string;
  onAccountChange: (account: any) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({ accounts, curAccount, onAccountChange }) => {
  return (
    <div style={{ padding: '8px' }}>
      {/* <Typography.Title level={5} style={{ marginBottom: '16px' }}>
          频道列表
        </Typography.Title> */}

      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 统计信息 */}
        {/* <Card size="small">
            <Statistic 
              title="可用频道" 
              value={accounts.filter(acc => acc.enable && acc.running).length}
              suffix={`/ ${accounts.length}`}
            />
          </Card> */}

        {/* 频道列表 */}
        <Menu
          mode="inline"
          selectedKeys={curAccount ? [curAccount] : ['all']}
          defaultSelectedKeys={['all']} // 设置默认选中项
          //   items={accounts.map((account) => ({
          //     key: account.channelId,
          //     label: (
          //       <Tooltip
          //         title={account.enable && account.running ? '点击查看任务' : '频道不可用'}
          //         placement="right"
          //       >
          //         <Space>
          //           {account.running ? (
          //             <CheckCircleOutlined style={{ color: '#52c41a' }} />
          //           ) : (
          //             <StopOutlined style={{ color: '#ff4d4f' }} />
          //           )}
          //           <span>{account.channelId}</span>
          //           {account.remark && (
          //             <Tag style={{ fontSize: '12px', padding: '0 4px' }}>{account.remark}</Tag>
          //           )}
          //         </Space>
          //       </Tooltip>
          //     ),
          //     disabled: !account.enable || !account.running,
          //   }))}
          onClick={({ key }) => onAccountChange(key)}
        >
          <Menu.Item key="all">全部</Menu.Item>
          {accounts.map((account) => (
            <Menu.Item key={account.channelId}>{account.channelId}</Menu.Item>
          ))}
        </Menu>
      </Space>
    </div>
  );
};

export default ChannelList;
