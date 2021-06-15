import React,  { useEffect, useRef, useState } from 'react';
import { inject, observer } from 'mobx-react';
import { View } from '@tarojs/components';
import Header from '../header';
import List from '../list'
import BottomNavBar from '../bottom-nav-bar'
import { useDidShow } from '@tarojs/taro'
import Taro from '@tarojs/taro';
import { throttle } from '@common/utils/throttle-debounce.js';

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

const BaseLayout = (props) => {
  const { 
    index, 
    showHeader = true, 
    showTabBar = false, 
    showPullDown = false, 
    children = null, 
    onPullDown, 
    isFinished = true, 
    curr, 
    onScroll = () => {}, 
    baselayout, 
    pageName, 
    onClickTabBar = () => {}
  } = props;
  const [height, setHeight] = useState(600);

  // 避免小程序通过手势返回上一页时，无法重置参数
  useDidShow(() => {
    index.setHiddenTabBar(false)
    index.setHasOnScrollToLower(true)
  })

  // const pullDownWrapper = useRef(null)
  const listRef = useRef(null);

  // useEffect(() => {
  //   console.log(`pullDownWrapper`, pullDownWrapper)
  //   if (pullDownWrapper?.current) {
  //     setHeight(pullDownWrapper.current.clientHeight)
  //   }

  // }, [])

  useEffect(() => {
    if (baselayout.videoFullScreenStatus === "offFullScreen" &&
        pageName && baselayout[pageName] > 0) {
      setTimeout(() => {
        listRef.current.jumpToScrollTop(baselayout[pageName]);
        baselayout.videoFullScreenStatus = "";
      }, 0);
    }
  }, [baselayout.videoFullScreenStatus])

  const handleScroll = throttle((e) => {

    onScroll(e);

    const { baselayout } = props;
    const playingVideoDom = baselayout.playingVideoDom;
    const playingAudioDom = baselayout.playingAudioDom;

    if (e?.detail?.scrollTop && pageName) baselayout[pageName] = e.detail.scrollTop;

    Taro.getSystemInfo({
      success(res) {

        if (playingVideoDom) {
          Taro.createSelectorQuery()
          .select(`#${playingVideoDom}`)
          .boundingClientRect((rect) => { 
            if(rect.top > res.windowHeight || rect.bottom < 0) {
              Taro.createVideoContext(playingVideoDom)?.pause();
              baselayout.playingVideoDom = "";
            }
          }).exec();
        }

        if(playingAudioDom) {
          Taro.createSelectorQuery()
            .select(`#${baselayout?.playingAudioWrapperId}`)
            .boundingClientRect((rect) => {
            if(rect.top > res.windowHeight || rect.bottom < 0) {
              baselayout.playingAudioDom.pause();
              baselayout.playingAudioDom = null;
            }
          }).exec();
        }

      }
    });

  }, 50);

  return (
    <View className={styles.container}>
        {showHeader && <Header />}
        {
          showPullDown ? (
            <View className={styles.list} ref={pullDownWrapper}>
              {/* <PullDownRefresh onRefresh={onPullDown} isFinished={isFinished} height={height}> */}
                  <List {...props} className={styles.listHeight} ref={listRef} hasOnScrollToLower={index.hasOnScrollToLower} onScroll={handleScroll}>
                      {typeof(children) === 'function' ? children({ ...props }) : children}
                  </List>
              {/* </PullDownRefresh> */}
            </View>
          ) : (
            <List {...props} className={styles.list} ref={listRef} hasOnScrollToLower={index.hasOnScrollToLower} onScroll={handleScroll}>
                {typeof(children) === 'function' ? children({ ...props }) : children}
            </List>
          )
        }

        {showTabBar && <BottomNavBar onClick={onClickTabBar} placeholder curr={curr} />}
    </View>
  );
};

export default inject('baselayout', 'index')(observer(BaseLayout));