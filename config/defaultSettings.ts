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
  fixedHeader: true,
  // headerRender: false,
  // fixSiderbar: true,
  // splitMenus: true,
  contentStyle: {
    // height: '100vh',
    // height: 'calc(100vh - 56px)',
    overflow: 'hidden',
    position: 'fixed',
    top: '56px',
    padding: '0px',
    margin: '0px',
  },
  colorWeak: false,
  title: 'Midjourney',
  pwa: true,
  logo: './logo.svg',
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
  },
};

export default Settings;
