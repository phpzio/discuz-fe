import React from 'react';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'next/router';
import Header from '@components/header';
import List from '@components/list';
import NoData from '@components/no-data';
import ThreadContent from '@components/thread';
import { Spin } from '@discuzq/design';
import styles from './index.module.scss';

@inject('site')
@inject('index')
@observer
class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      height: '100%',
    };
  }

  componentDidMount() {
    this.setState({
      // header 是 40px，留出 2px ，用以触发下拉事件
      height: window.outerHeight - 94,
    });
  }

  render() {
    const { index, page, totalPage } = this.props;
    const { pageData = [] } = index.threads || {};
    return (
      <div className={styles.collectBox}>
        <Header />
        {pageData?.length !== 0 && <div className={styles.titleBox}>{`${this.props.totalCount}条购买`}</div>}
        {this.props.firstLoading && (
          <div className={styles.spinLoading}>
            <Spin type="spinner">加载中...</Spin>
          </div>
        )}
        {pageData?.length ? (
          <List
            height={this.state.height}
            className={styles.list}
            noMore={page > totalPage}
            onRefresh={this.props.dispatch}
          >
            <div className={styles.buySplitLine}/>
            {pageData?.map((item, index) => (
              <ThreadContent className={styles.listItem} key={index} data={item} />
            ))}
          </List>
        ) : (
          <>{!this.props.firstLoading && <NoData className={styles.noDataList} />}</>
        )}
      </div>
    );
  }
}

export default withRouter(Index);
