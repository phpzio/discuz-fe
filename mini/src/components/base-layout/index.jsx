import React,  { useEffect, useRef, useState } from 'react';
import { inject, observer } from 'mobx-react';
import { View } from '@tarojs/components';
import Header from '../header';
import List from '../list'
import BottomNavBar from '../bottom-nav-bar'
import { PullDownRefresh } from "@discuzq/design"

import styles from './index.module.scss';

/**
* PC端集成布局组件
* @prop {function} children 内容区域中间视图组件
* @prop {function} showHeader 是否显示头部组件
* @prop {function} showTabBar 是否显示底部tabBar组件
* @prop {function} showPullDown 是否集成下拉刷新
* @prop {function} onPullDown 下拉刷新事件
* @prop {function} isFinished 是否完成下拉刷新
* @prop other List Props // List组件所有的属性
* @example 
*     <BaseLayout>
        {(props) => <View>中间</View>}
      </BaseLayout>
*/
const baseLayoutWhiteList = ['home'];

const BaseLayout = (props) => {
  const { showHeader = true, showTabBar = false, showPullDown = false, children = null, onPullDown, isFinished = true, curr } = props;
  const { jumpToScrollingPos } = props.baselayout;
  const [height, setHeight] = useState(600);

  const debounce = (fn, wait) => {
    let timer = null;
    return () => {
      if(timer !== null){
        clearTimeout(timer);
      }
      timer = setTimeout(fn, wait);
    }
  }

  const pullDownWrapper = useRef(null)
  const listRef = useRef(null);

  useEffect(() => {
    if (pullDownWrapper?.current) {
      setHeight(pullDownWrapper.current.clientHeight)
    }

    if (listRef?.current && jumpToScrollingPos > 0 && baseLayoutWhiteList.indexOf(props.pageName) !== -1) {
      listRef.current.jumpToScrollTop(jumpToScrollingPos);
    }
  }, [])

  return (
    <View className={styles.container}>
        {showHeader && <Header />}
        {
          showPullDown ? (
            <View className={styles.list} ref={pullDownWrapper}>
              <PullDownRefresh onRefresh={onPullDown} isFinished={isFinished} height={height}>
                  <List {...props} className={styles.listHeight} ref={listRef}>
                      {typeof(children) === 'function' ? children({ ...props }) : children}
                  </List>
              </PullDownRefresh>
            </View>
          ) : (
            <List {...props} className={styles.list} ref={listRef}>
                {typeof(children) === 'function' ? children({ ...props }) : children}
            </List>
          )
        }

        {showTabBar && <BottomNavBar placeholder curr={curr} />}
    </View>
  );
};

export default inject('baselayout')(observer(BaseLayout));