import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styles from './index.module.scss';
import { Dialog, Button, Icon, Toast } from '@discuzq/design';
import HOCFetchSiteData from '@middleware/HOCFetchSiteData';
import { numberFormat } from '@common/utils/number-format';
import renewPay from '@common/pay-bussiness/renew-pay';

@inject('site')
@inject('user')
@observer
class RenewalFee extends Component {
  constructor(props) {
    super(props);
  }

  onClose = () => {
    this.props.onClose && this.props.onClose();
  };

  handleRenewPay = async () => {
    const sitePrice = this.props.site?.sitePrice;
    const siteName = this.props.site?.siteName;
    const userStore = this.props.user;
    const siteStore = this.props.site;
    try {
      await renewPay({ sitePrice, siteName, userStore, siteStore });
      this.onClose();
    } catch (error) {
      console.error(error);
      this.onClose();
    }
  };

  render() {
    return (
      <div className={styles.renewalFeeWrapper}>
        <Dialog visible={this.props.visible} position="center" maskClosable={true}>
          <div className={styles.renewalFeeContent}>
            {/* 关闭按钮 */}
            <div className={styles.renewalFeeClose} onClick={this.onClose}>
              <Icon name="CloseOutlined" size={12} color="#fff" />
            </div>
            <div className={styles.siteBg}>
              <img className={styles.siteBgImage} src={this.props.site?.siteBackgroundImage} />
            </div>
            <div className={styles.menuInfo}>
              <div className={styles.menuItem}>
                <div className={styles.menuTitle}>站点名称</div>
                <div className={styles.menuValue}>{this.props.site?.siteName}</div>
              </div>
              <div className={styles.menuItem}>
                <div className={styles.menuTitle}>站长</div>
                <div className={styles.menuValue}>
                  {this.props.site?.siteAuthor?.nickname || this.props.site?.siteAuthor.username}
                </div>
              </div>
              <div className={styles.menuItem}>
                <div className={styles.menuTitle}>更新</div>
                <div className={styles.menuValue}>刚刚</div>
              </div>
              <div className={styles.menuItem}>
                <div className={styles.menuTitle}>成员</div>
                <div className={styles.menuValue}>{numberFormat(this.props.site?.countUsers)}</div>
              </div>
              <div className={styles.menuItem}>
                <div className={styles.menuTitle}>主题</div>
                <div className={styles.menuValue}>{this.props.site?.countThreads}</div>
              </div>
            </div>
            <div className={styles.feeBtn}>
              {!this.props.user?.isIndefiniteDuration && (
                <Button type="primary" className={styles.btn} onClick={this.handleRenewPay}>
                  ￥{this.props.site?.sitePrice} 立即续费
                </Button>
              )}
              <div className={styles.effectTimer}>有效期：{this.props.site?.siteExpire}天</div>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }
}

export default HOCFetchSiteData(RenewalFee);