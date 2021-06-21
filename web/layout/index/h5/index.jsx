import React, { createRef, Fragment } from 'react';
import { inject, observer, Observer } from 'mobx-react';
import { Icon, Tabs } from '@discuzq/design';
import ThreadContent from '@components/thread';
import HomeHeader from '@components/home-header';
import styles from './index.module.scss';
import TopNew from './components/top-news';
import FilterView from './components/filter-view';
import BaseLayout from '@components/base-layout';
import initJSSdk from '@common/utils/initJSSdk.js';
import { getSelectedCategoryIds } from '@common/utils/handleCategory';
import wxAuthorization from '../../user/h5/wx-authorization';
import VList from '@components/virtual-list/example/index';
import classnames from 'classnames';

@inject('site')
@inject('user')
@inject('index')
@inject('baselayout')
@observer
class IndexH5Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      isFinished: true,
      fixedTab: false,
    };
    this.listRef = createRef();
    // 用于获取顶部视图的高度
    this.headerRef = createRef(null);

    // 是否开启虚拟滚动
    this.enableVlist = true;
  }

  componentDidMount() {
    try {
      this.handleWeiXinShare();
    } catch (error) {}

    // 是否有推荐
    const isDefault = this.props.site.checkSiteIsOpenDefautlThreadListData();
    this.props.index.setNeedDefault(isDefault);
  }

  handleWeiXinShare = async () => {
    let { href } = window.location;
    href = href.split('/');
    href = [href[0], href[1], href[2]];
    href = href.join('/');
    const { site } = this.props;
    const title = site.webConfig?.setSite?.siteName || 'Discuz! Q';
    const desc = site.webConfig?.setSite?.siteUrl || href;
    const imgUrl = site.webConfig?.setSite?.siteLogo;
    const link = site.webConfig?.setSite?.siteUrl;
    await initJSSdk(['updateAppMessageShareData', 'updateTimelineShareData']);
    wx.ready(() => {
      // 需在用户可能点击分享按钮前就先调用
      wx.updateAppMessageShareData({
        title, // 分享标题
        desc, // 分享描述
        link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
      });

      wx.updateTimelineShareData({
        title, // 分享标题
        link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
        imgUrl, // 分享图标
      });
    });
  };

  // 点击更多弹出筛选
  searchClick = () => {
    this.setState({ visible: true });
  };
  // 关闭筛选框
  onClose = () => {
    this.setState({ visible: false });
  };

  // 点击底部tabBar
  onClickTabBar = (data, index) => {
    if (index !== 0) {
      return;
    }
    this.changeFilter();
  };

  onClickTab = (id = '') => {
    this.changeFilter({ categoryids: [id], sequence: id === 'default' ? 1 : 0 });
  };

  changeFilter = (params) => {
    const { index, dispatch = () => {} } = this.props;

    if (params) {
      const { categoryids } = params;
      const categories = index.categories || [];

      // 获取处理之后的分类id
      const id = categoryids[0];
      const newCategoryIds = getSelectedCategoryIds(categories, id);

      const newFilter = { ...index.filter, ...params, categoryids: newCategoryIds };

      index.setFilter(newFilter);
    }

    dispatch('click-filter');

    this.setState({ visible: false });
  };

  // 上拉加载更多
  onRefresh = () => {
    const { dispatch = () => {} } = this.props;
    return dispatch('moreData');
  };

  handleScroll = ({ scrollTop = 0 } = {}) => {
    const { height = 180 } = this.headerRef.current?.state || {};
    const { fixedTab } = this.state;
    // 只需要滚到临界点触发setState，而不是每一次滚动都触发
    if (!fixedTab && scrollTop >= height) {
      this.setState({ fixedTab: true });
    } else if (fixedTab && scrollTop < height) {
      this.setState({ fixedTab: false });
    }
  };

  renderTabs = () => {
    const { fixedTab } = this.state;
    const { categories = [], activeCategoryId, currentCategories } = this.props.index;

    return (
      <>
        {categories?.length > 0 && (
          <>
            <div ref={this.listRef} className={`${styles.homeContent} ${this.enableVlist && fixedTab && styles.fixed}`}>
              <Tabs
                className={styles.tabsBox}
                scrollable
                type="primary"
                onActive={this.onClickTab}
                activeId={activeCategoryId}
                tabBarExtraContent={
                  <div onClick={this.searchClick} className={styles.tabIcon}>
                    <Icon name="SecondaryMenuOutlined" className={styles.buttonIcon} size={16} />
                  </div>
                }
              >
                {currentCategories?.map((item, index) => (
                  <Tabs.TabPanel key={index} id={item.pid} label={item.name} />
                ))}
              </Tabs>
            </div>
            {this.enableVlist && fixedTab && <div className={styles.tabPlaceholder}></div>}
          </>
        )}
      </>
    );
  };

  renderHeaderContent = () => {
    const { sticks = [] } = this.props.index || {};

    return (
      <>
        {sticks?.length > 0 && (
          <div className={styles.homeContentTop}>
            <TopNew data={sticks} itemMargin="1" />
          </div>
        )}
      </>
    );
  };

  render() {
    const { index } = this.props;
    const { filter, isFinished, currentCategories } = this.state;
    const { threads = {}, sticks } = index;
    const { currentPage, totalPage, pageData } = threads || {};

    return (
      <BaseLayout
        showHeader={false}
        showTabBar
        onRefresh={this.onRefresh}
        noMore={currentPage >= totalPage}
        isFinished={isFinished}
        onScroll={this.handleScroll}
        quickScroll={true}
        curr="home"
        pageName="home"
        onClickTabBar={this.onClickTabBar}
        requestError={this.props.isError}
        errorText={this.props.errorText}
        disabledList={this.enableVlist}
      >
        {this.enableVlist && (
          <Fragment>
            <div className={classnames(styles.vTabs, 'text', this.state.fixedTab && styles.vFixed)}>
              {this.renderTabs()}
            </div>

            <VList
              list={pageData}
              sticks={sticks}
              onScroll={this.handleScroll}
              loadNextPage={this.onRefresh}
              noMore={currentPage >= totalPage}
              requestError={this.props.isError}
              renderItem={(item, index, recomputeRowHeights, onContentHeightChange, measure) => (
                <ThreadContent
                  onContentHeightChange={measure}
                  onImageReady={measure}
                  onVideoReady={measure}
                  key={index}
                  // showBottomStyle={index !== pageData.length - 1}
                  data={item}
                  className={styles.listItem}
                  recomputeRowHeights={measure}
                />

                // <ThreadContent
                //   onContentHeightChange={(height) => onContentHeightChange(height, index)}
                //   onImageReady={measure}
                //   onVideoReady={measure}
                //   key={index}
                //   // showBottomStyle={index !== pageData.length - 1}
                //   data={item}
                //   className={styles.listItem}
                //   recomputeRowHeights={recomputeRowHeights}
                // />
              )}
            >
              <HomeHeader ref={this.headerRef} />
              <Observer>{() => this.renderTabs()}</Observer>
              <Observer>{() => this.renderHeaderContent()}</Observer>
            </VList>
          </Fragment>
        )}

        {!this.enableVlist && (
          <Fragment>
            <HomeHeader ref={this.headerRef} />
            {this.renderTabs()}
            {this.renderHeaderContent()}

            {pageData?.map((item, index) => (
              <ThreadContent
                key={index}
                showBottomStyle={index !== pageData.length - 1}
                data={item}
                className={styles.listItem}
              />
            ))}
          </Fragment>
        )}

        <FilterView
          data={currentCategories}
          current={filter}
          onCancel={this.onClose}
          visible={this.state.visible}
          onSubmit={this.changeFilter}
        />
      </BaseLayout>
    );
  }
}

export default IndexH5Page;
