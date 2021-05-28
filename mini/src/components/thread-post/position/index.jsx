/**
 * 定位组件
 */
import React, { memo, useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import Icon from '@discuzq/design/dist/components/icon/index';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Taro from '@tarojs/taro';

const Index = (props) => {
  const { currentPosition = {}, positionChange = () => {} } = props;

  // 是否已经选择定位
  const [isChose, setIsChose] = useState(false);
  // 当前定位
  const [positon, setPosition] = useState({});


  useEffect(() => {
    if (currentPosition.name) {
      setPosition(currentPosition);
    }
  }, []);

  // 选择定位
  const chooseLocation = () => {
    Taro.authorize({
      scope: 'scope.userLocation',
      success: function () {
        // 用户已经同意小程序使用定位功能，后续调用 Taro.chooseLocation 接口不会弹窗询问
        Taro.chooseLocation({
          ...positon,
          success(ret) {
            setPosition(ret);
            setIsChose(true);
            positionChange(positon);
          }
        });
      }
    });
  };

  // 删除定位
  const removeLocation = () => {
    setPosition({});
    setIsChose(false);
    positionChange(positon);
  };


  return (
    <View onClick={chooseLocation} className={classNames(styles['positon'], {
      [styles['chose']]: isChose,
    })}>
      <Icon name='PositionOutlined' size={10} />
      <Text className={styles['text']}>{positon.name || '你在哪里？'}</Text>
      {isChose && <Icon className={styles['remove-icon']} name='CloseOutlined' size={10} onClick={(e) => {
        removeLocation();
        e.stopPropagation();
        return false;
      }} />}
    </View>
  );
};

Index.propTypes = {
  /**
   * 位置变化的回调
   */
   positionChange: PropTypes.func,

   currentPosition: PropTypes.object,
};


export default memo(Index);
