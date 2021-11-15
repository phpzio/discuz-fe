import React from 'react';
import { inject, observer } from 'mobx-react';
import { View, Text } from '@tarojs/components';
import DataStatisticsCards from '@components/data-statistics-cards';
import SectionTitle from '@components/section-title';
import styles from './index.module.scss';
import ReadSourceDistrict from '@components/thread-read-source';

class ThreadData extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dataStatistics: [
        {
          id: 'totalReaderNumber',
          label: '阅读者（人）',
          value: 155,
          visible: true,
        },
        {
          id: 'totalSharerNumber',
          label: '分享者（人）',
          value: 30,
          visible: true,
        },
        {
          id: 'totalThreadFissionMoney',
          label: '裂变率（%）',
          value: 50,
          visible: true,
        },
        {
          id: 'fissionRate',
          label: '发出红包（元）',
          value: 266,
          visible: true,
        },
        {
          id: 'unlockContentNumber',
          label: '解锁内容（人）',
          value: 168,
          visible: true,
        },
      ],
    };
  }

  render() {
    const { dataStatistics } = this.state;

    const data1 = [
      { y: 63.4, x: '10-01' },
      { y: 62.7, x: '10-02' },
      { y: 72.2, x: '10-03' },
      { y: 58, x: '10-04' },
      { y: 59.9, x: '10-05' },
      { y: 67.7, x: '10-06' },
      { y: 53.3, x: '10-07' },
    ];
    return (
      <View className={styles.mobileLayout}>
        <View>
          <View className={styles.dividerContainer}>
            <SectionTitle title="帖子详情" isShowMore={false} />
          </View>
        </View>

        <View className={styles.unit}>
          <View className={styles.dividerContainer}>
            <SectionTitle title="核心数据" isShowMore={false} />
            <View className={styles.dataSourceContainer}>
              <DataStatisticsCards dataSource={dataStatistics} rowCardCount={3} />
            </View>
            <ReadSourceDistrict xData={data1.map((it) => it.x)} yData={data1.map((it) => it.y)} />
          </View>
        </View>

        <View className={styles.unit}>
          <View className={styles.dividerContainer}>
            <SectionTitle title="分享者列表" leftNum="每天10:00更新" isShowMore={false} />
          </View>
        </View>
      </View>
    );
  }
}

export default ThreadData;
