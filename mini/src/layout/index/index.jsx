import React, { createRef } from 'react';
import { inject, observer, Observer } from 'mobx-react';
import Icon from '@discuzq/design/dist/components/icon/index';
import Tabs from '@discuzq/design/dist/components/tabs/index';
import { View } from '@tarojs/components'
import ThreadContent from '../../components/thread';
import HomeHeader from '../../components/home-header';
import FilterView from './components/filter-view';
import BaseLayout from '../../components/base-layout';
import TopNew from './components/top-news';
import NavBar from './components/nav-bar';
import { getSelectedCategoryIds } from '@common/utils/handleCategory';
import Taro from '@tarojs/taro';
import { debounce } from '@common/utils/throttle-debounce.js';
import styles from './index.module.scss';
import VirtualList from '@components/virtual-list/group';
import IndexTabs from './components/tabs'
import ThreadList from './list'
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
      filter: {},
      currentIndex: 'all',
      isFinished: true,
      fixedTab: false,
      navBarHeight: 64,
      headerHeight: 210,
      isClickTab: false,
      windowHeight: 0
    };
    this.tabsRef = createRef();
    this.headerRef = createRef(null);
    this.isChange = true
  }

  setNavigationBarStyle = () => {
    Taro.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#000000'
    })
  }

  componentDidMount() {

    this.setNavigationBarStyle();

    let navBarHeight = 64
    try {
      const res = Taro.getSystemInfoSync()
      const height = res?.statusBarHeight || 20
      navBarHeight = 44 + height;

      const headerId = this.headerRef?.current?.domRef?.current?.uid;
      let headerHeight = 210;
      if(headerId) { // 获取Header的高度
        Taro.createSelectorQuery()
        .select(`#${headerId}`)
        .boundingClientRect((rect) => {
          headerHeight = rect?.height || 210;
        }).exec();
      }
      this.setState({ headerHeight });
    } catch (e) {
      // Do something when catch error
    }

    this.setState({ navBarHeight })

    // 是否有推荐
    const isDefault = this.props.site.checkSiteIsOpenDefautlThreadListData();
    this.props.index.setNeedDefault(isDefault);
  }

  // 点击更多弹出筛选
  searchClick = () => {
    this.props.index.setHiddenTabBar(true)

    this.setState({ visible: true });
  };
  // 关闭筛选框
  onClose = () => {
    this.props.index.setHiddenTabBar(false)

    this.setState({ visible: false });
  };

  onClickTab = (id = '') => {
    this.changeFilter({ categoryids: [id], sequence: id === 'default' ? 1 : 0 })
  };

  handleClickTabBar = (item, idx) => {
    if(item?.router === "/pages/home/index") { // 点击首页刷新
      this.changeFilter()
    }
  }

  changeFilter = (params) => {
    this.props.index.resetErrorInfo()
    this.setState({ isClickTab: true })

    this.props.baselayout.setJumpingToTop();
    this.props.index.setHiddenTabBar(false)

    const { index, dispatch = () => {} } = this.props

    if (params) {
      const { categoryids } = params
      const categories = index.categories || [];

      // 获取处理之后的分类id
      const id = categoryids[0]
      const newCategoryIds = getSelectedCategoryIds(categories, id)

      const newFilter = { ...index.filter, ...params, categoryids: newCategoryIds };

      index.setFilter(newFilter);
    }

    this.debounceDispatch()

    this.setState({ visible: false })
  }

  debounceDispatch = debounce(() => {
    const { dispatch = () => {} } = this.props
    dispatch('click-filter').then(() => {
      this.setState({ isClickTab: false });
    });
  }, 200)

  // 上拉加载更多
  onRefresh = () => {
    const { dispatch = () => {} } = this.props;
    return dispatch('moreData');
  };

  handleScroll = (e) => {
    const { scrollTop = 0 } = e?.detail || {};
    const { headerHeight } = this.state;
    const { fixedTab } = this.state;

    // 只需要滚到临界点触发setState，而不是每一次滚动都触发
    if(!fixedTab && scrollTop >= headerHeight) {
      this.setState({fixedTab: true});
    } else if(fixedTab && scrollTop < headerHeight) {
      this.setState({fixedTab: false});
    }

  }

  handleScrollToUpper = (e) => {
    if(this.state.fixedTab) {
      this.setState({fixedTab: false});
    }
  }

  renderTabs = () => {
    const { index, site } = this.props;
    const { fixedTab, navBarHeight } = this.state;
    const { categories = [], activeCategoryId, currentCategories } = index;

    return (
      <>
        {categories?.length > 0 && (
          <>
          <View
            ref={this.tabsRef}
            className={`${styles.homeContent} ${fixedTab ? styles.fixed : ''}`}
            style={{top: `${navBarHeight}px`}}
          >
            <Tabs
              className={styles.tabsBox}
              scrollable
              type="primary"
              onActive={this.onClickTab}
              activeId={activeCategoryId}
              external={
                <View onClick={this.searchClick} className={styles.tabIcon}>
                  <Icon name="SecondaryMenuOutlined" className={styles.buttonIcon} size={16} />
                </View>
              }
            >
              {currentCategories?.map((item, index) => (
                <Tabs.TabPanel key={index} id={item.pid} label={item.name} />
              ))}
            </Tabs>
          </View>
          <NavBar title={site?.webConfig?.setSite?.siteName || ''} isShow={fixedTab} />
          {fixedTab &&  <View className={styles.tabPlaceholder}></View>}
          </>
        )}
      </>
    );
  };

  renderHeaderContent = () => {
    const { sticks = [] } = this.props.index || {};

    return (
      <>
        {sticks && sticks.length > 0 && (
          <View className={styles.homeContentTop}>
            <TopNew data={sticks} itemMargin="1" />
          </View>
        )}
      </>
    );
  };

  render() {
    const { index, user } = this.props;
    const { isFinished, isClickTab } = this.state;
    const { threads = {}, currentCategories, filter, threadError } = index;
    const { currentPage = 1, totalPage, pageData } = threads || {};

    return (
      <BaseLayout
        showHeader={false}
        showTabBar
        onRefresh={this.onRefresh}
        noMore={!isClickTab && currentPage >= totalPage}
        isFinished={isFinished}
        onScroll={this.handleScroll}
        onScrollToUpper={this.handleScrollToUpper}
        curr='home'
        pageName='home'
        preload={3000}
        requestError={threadError.isError}
        errorText={threadError.errorText}
        onClickTabBar={this.handleClickTabBar}
      >
        <HomeHeader ref={this.headerRef} />

        <IndexTabs onClickTab={this.onClickTab} searchClick={this.searchClick} />

        <View style={{display: isClickTab ? 'none' : 'block'}}>
          {this.renderHeaderContent()}

          {
            !this.isChange ? (
              <ThreadList data={pageData} isClickTab={isClickTab} wholePageIndex={currentPage - 1} />
            ) : (
              pageData?.map((item, index) => (
                <ThreadContent
                  key={`${item.threadId}-${item.updatedAt}`}
                  showBottomStyle={index !== pageData.length - 1}
                  data={item}
                  className={styles.listItem}
                />
              ))
            )
          }
        </View>

        <FilterView
          data={currentCategories}
          current={filter}
          onCancel={this.onClose}
          visible={this.state.visible}
          onSubmit={this.changeFilter}
          permissions={user.threadExtendPermissions}
        />
      </BaseLayout>
    );
  }
}

export default IndexH5Page;
