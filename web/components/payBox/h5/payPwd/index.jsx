import React from 'react';
import styles from './index.module.scss';
import Header from '@components/header';
import { inject, observer } from 'mobx-react';
import CommonPayoffPwd from '../../components/common-paypwd-content';
import { Dialog, Divider, Icon, Toast } from '@discuzq/design';
import { PAY_BOX_ERROR_CODE_MAP, STEP_MAP } from '../../../../../common/constants/payBoxStoreConstants';
import throttle from '@common/utils/thottle.js';
import Router from '@discuzq/sdk/dist/router';

@inject('site')
@inject('user')
@inject('payBox')
@observer
class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      list: [],
      isShow: false,
    };
    this.keyboardClickHander = this.keyboardClickHander.bind(this);
  }

  initState = () => {
    this.setState({
      list: [],
      isShow: false,
    });
  };

  componentDidMount() {
    this.setState({
      isShow: true,
    });
  }

  componentWillUnmount() {
    this.initState();
  }

  updatePwd = (set_num, type) => {
    const { list = [] } = this.state;
    if (type == 'add') {
      let list_ = [...list];
      if (list.length >= 6) {
        list_ = list_.join('').substring(0, 5)
          .split('');
      }
      this.setState(
        {
          list: [].concat(list_, [set_num]),
        },
        () => {
          if (this.state.list.length === 6) {
            throttle(this.submitPwa(), 500);
          }
        },
      );
    } else if (type == 'delete') {
      this.setState({
        list: list.slice(0, list.length - 1),
      });
    }
  };

  keyboardClickHander(e) {
    const key = e.target.getAttribute('data-key');
    if (key == null) {
      return null;
    }
    const { list = [] } = this.state;

    if (key === '-1') {
      if (list.length === 0) {
        this.handleCancel();
      } else {
        this.setState({
          list: list.slice(0, list.length - 1),
        });
      }
    } else if (list.length < 6) {
      this.setState(
        {
          list: [].concat(list, [key]),
        },
        () => {
          if (this.state.list.length === 6) {
            throttle(this.submitPwa(), 500);
          }
        },
      );
    }
  }

  handleForgetPayPwd = () => {
    Router.push({ url: '/my/edit/find-paypwd?type=payBox' });
    this.initState()
    this.props.payBox.visible = false;
  }

  async submitPwa() {
    const { list = [] } = this.state;
    const pwd = list.join('');
    this.props.payBox.password = pwd;
    if (this.props.payBox.step === STEP_MAP.WALLET_PASSWORD) {
      // 表示钱包支付密码
      try {
        await this.props.payBox.walletPayOrder();
        Toast.success({
          content: '支付成功',
          hasMask: false,
          duration: 1000,
        });
        setTimeout(() => {
          this.props.payBox.clear();
        }, 500);
      } catch (error) {
        Toast.error({
          content: error.Message || '支付失败，请重新输入',
          hasMask: false,
          duration: 1000,
        });
        this.setState({
          list: [],
        });
      }
    }
  }

  // 点击取消或者关闭---回到上个页面
  handleCancel = () => {
    this.props.payBox.step = STEP_MAP.PAYWAY;
    this.initState();
  };

  // 渲染弹窗形式支付
  renderDialogPayment = () => {
    const { list = [], isShow } = this.state;
    const { options = {} } = this.props?.payBox;
    return (
      <div>
        <Dialog className={styles.paypwdDialogWrapper} visible={isShow} position="center" maskClosable={true}>
          <div className={styles.paypwdDialogContent}>
            <div className={styles.paypwdTitle}>立即支付</div>
            <div className={styles.paypwdAmount}>
              <span className={styles.moneyUnit}>￥</span>
              {Number(options.amount).toFixed(2)}
            </div>
            <Divider className={styles.paypwdDivider} />
            <div className={styles.paypwdMesg}>
              <span className={styles.payLabel}>支付方式</span>
              <span>
                <Icon className={styles.walletIcon} name="PurseOutlined" />
                <span style={{ verticalAlign: 'middle' }}>钱包支付</span>
              </span>
            </div>
            <div className={styles.paypwdMesg}>
              <span className={styles.payLabel}>支付密码</span>
            </div>

            <CommonPayoffPwd list={list} updatePwd={this.updatePwd} whetherIsShowPwdBox={true} />
            {/* TODO: 忘记支付密码的链接添加 */}
            <div className={styles.forgetPasswordContainer} onClick={this.handleForgetPayPwd}>
              <span>忘记支付密码?</span>
            </div>
            {/* 关闭按钮 */}
            <div className={styles.payBoxCloseIcon} onClick={this.handleCancel}>
              <Icon name="CloseOutlined" size={16} />
            </div>
          </div>
        </Dialog>
      </div>
    );
  };

  render() {
    const { list = [], isShow } = this.state;
    return (
      <div style={{ position: 'relative', zIndex: 1400 }}>
        {this.renderDialogPayment()}
        <div style={{display:!isShow && 'none'}} className={styles.keyboard} onClick={this.keyboardClickHander}>
          <div className={styles.line}>
            <div data-key="1" className={styles.column}>
              1
            </div>
            <div data-key="2" className={styles.column}>
              2
            </div>
            <div data-key="3" className={styles.column}>
              3
            </div>
          </div>
          <div className={styles.line}>
            <div data-key="4" className={styles.column}>
              4
            </div>
            <div data-key="5" className={styles.column}>
              5
            </div>
            <div data-key="6" className={styles.column}>
              6
            </div>
          </div>
          <div className={styles.line}>
            <div data-key="7" className={styles.column}>
              7
            </div>
            <div data-key="8" className={styles.column}>
              8
            </div>
            <div data-key="9" className={styles.column}>
              9
            </div>
          </div>
          <div className={styles.line}>
            <div className={`${styles.column} ${styles.special}`}></div>
            <div data-key="0" className={styles.column}>
              0
            </div>
            <div data-key="-1" className={`${styles.column} ${styles.special}`}>
              <Icon name="BackspaceOutlined" size={16} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// eslint-disable-next-line new-cap
export default Index;
