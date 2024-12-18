import { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  // 拂晓蓝
  colorPrimary: '#1890ff',
  // layout: 'mix',
  layout: 'top',
  // contentWidth: 'Fluid',
  // fixedHeader: true,

  style: { 
    height: '100vh',
    // overflow: 'hidden'  // 防止整体出现滚动条

   },
  // headerRender: false,
  // fixSiderbar: true,
  // splitMenus: true,
  contentStyle: {
    // display: 'flex',
    // height: '100vh',
    // marginTop: 56,
    // height: 'calc(100vh - 56px)',
    // overflow: 'hidden',
    // top: '56px',
    // position: 'relative',
    // flexDirection: 'column',
    // padding: '0px',
    // margin: '0px',
    // paddingBlock: '0px',  // 消除Content的padding
    // paddingInline: '0px',  // 消除Content的padding
  },
  colorWeak: false,
  title: 'Midjourney',
  pwa: true,
  logo: './logo.svg',
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
    pageContainer: {
      paddingBlockPageContainerContent: 0,
      paddingInlinePageContainerContent: 0,
    }
  },
};

const mjApiSecret = 'admin'; // 获取保存的密码

console.log('mjApiSecret', mjApiSecret);

export default { ...Settings, mjApiSecret };
