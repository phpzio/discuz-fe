import Taro from '@tarojs/taro';
import Toast from '@discuzq/design/dist/components/toast';
import goToLoginPage from '@common/utils/go-to-login-page';
import { inject, observer } from 'mobx-react';
/**
 * @param {boolean} needShareline 是否需要分享到朋友圈
 * @param {boolean} needLogin 是否需要登录
 * @returns
 */
function withShare(opts = {}) {
  // 设置默认
  const defalutTitle = 'Discuz!Q';
  const defalutPath = 'pages/index/index';
  let menus = [];
  const { needShareline = true, needLogin = true } = opts;
  menus = ['shareAppMessage'];
  return function demoComponent(Component) {
    @inject('user')
    @observer
    class WithShare extends Component {
      componentDidMount() {
        Taro.showShareMenu({
          withShareTicket: true,
          menus,
        });
        if (super.componentDidMount) {
          super.componentDidMount();
        }
      }
      onShareAppMessage = (res) => {
        const { user } = this.props;
        // 是否必须登录
        if (needLogin && !user.isLogin()) {
          Toast.info({ content: '请先登录!' });
          goToLoginPage({ url: '/subPages/user/wx-auth/index' });
          const promise = Promise.reject();
          return {
            promise,
          };
        }
        const data = res.target?.dataset?.shareData || '';
        let shareData = '';
        if (this.getShareData && typeof this.getShareData === 'function') {
          shareData = this.getShareData({ ...data, from: res.from });
        }
        let { title = defalutTitle, path = '', imageUrl = '' } = shareData;

        if (path === '') {
          try {
            const $instance = Taro.getCurrentInstance();
            const { router } = $instance;
            const currPath = router.path;
            path = currPath;
          } catch (err) {
            path = defalutPath;
          }
        }
        const encodePath = `/pages/index/index?path=${encodeURIComponent(path)}`;
        return {
          title,
          path: encodePath,
          imageUrl,
        };
      }

      render() {
        return super.render();
      }
    }

    return WithShare;
  };
}

export default withShare;

