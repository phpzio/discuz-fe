import React, { Fragment } from 'react';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'next/router';

import layout from './layout.module.scss';
import footer from './footer.module.scss';

import NoMore from './components/no-more';
import LoadingTips from './components/loading-tips';

import styleVar from '@common/styles/theme/default.scss.json';
import { Icon, Input, Badge, Toast } from '@discuzq/design';
import Header from '@components/header';

import ReportPopup from './components/report-popup';
import ShowTop from './components/show-top';
import DeletePopup from '@components/thread-detail-pc/delete-popup';
import MorePopup from './components/more-popup';
import InputPopup from './components/input-popup';
import throttle from '@common/utils/thottle';
import xss from '@common/utils/xss';

import h5Share from '@discuzq/sdk/dist/common_modules/share/h5';
import rewardPay from '@common/pay-bussiness/reward-pay';
import RewardPopup from './components/reward-popup';

import RenderThreadContent from './content';
import RenderCommentList from './comment-list';

@inject('site')
@inject('user')
@inject('thread')
@inject('comment')
@inject('index')
@observer
class ThreadH5Page extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showReportPopup: false, // 是否弹出举报弹框
      showDeletePopup: false, // 是否弹出删除弹框
      showCommentInput: false, // 是否弹出评论框
      showMorePopup: false, // 是否弹出更多框
      showRewardPopup: false, // 打赏弹窗
      isCommentLoading: false, // 列表loading
      setTop: false, // 置顶
      showContent: '',
      // inputValue: '', // 评论内容
    };

    this.perPage = 5;
    this.page = 1; // 页码
    this.commentDataSort = true;

    // 滚动定位相关属性
    this.threadBodyRef = React.createRef();
    this.commentDataRef = React.createRef();
    this.position = 0;
    this.nextPosition = 0;
    this.flag = true;

    // 修改评论数据
    this.comment = null;

    // 举报内容选项
    this.reportContent = ['广告垃圾', '违规内容', '恶意灌水', '重复发帖'];
    this.inputText = '其他理由...';
  }

  // 滚动事件
  handleOnScroll() {
    // 加载评论列表
    const scrollDistance = this.threadBodyRef?.current?.scrollTop;
    const offsetHeight = this.threadBodyRef?.current?.offsetHeight;
    const scrollHeight = this.threadBodyRef?.current?.scrollHeight;
    const { isCommentReady, isNoMore } = this.props.thread;
    if (scrollDistance + offsetHeight >= scrollHeight && !this.state.isCommentLoading && isCommentReady && !isNoMore) {
      this.page = this.page + 1;
      this.loadCommentList();
    }

    if (this.flag) {
      this.nextPosition = this.threadBodyRef?.current?.scrollTop || 0;
    }
  }

  componentDidMount() {
    // 当内容加载完成后，获取评论区所在的位置
    this.position = this.commentDataRef?.current?.offsetTop - 50;
  }

  componentDidUpdate() {
    // 当内容加载完成后，获取评论区所在的位置
    if (this.props.thread.isReady) {
      this.position = this.commentDataRef?.current?.offsetTop - 50;
    }
  }

  componentWillUnmount() {
    // 清空数据
    // this.props?.thread && this.props.thread.reset();
  }

  // 点击信息icon
  onMessageClick() {
    const position = this.flag ? this.position : this.nextPosition;
    this.flag = !this.flag;
    this.threadBodyRef.current.scrollTo(0, position);
  }

  // 点击收藏icon
  async onCollectionClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '请先登录!' });
      return;
    }

    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      isFavorite: !this.props.thread?.isFavorite,
    };
    const { success, msg } = await this.props.thread.updateFavorite(params);

    if (success) {
      Toast.success({
        content: '操作成功',
      });
      return;
    }

    Toast.error({
      content: msg,
    });
  }

  // 加载评论列表
  async loadCommentList() {
    const { isCommentReady } = this.props.thread;
    if (this.state.isCommentLoading || !isCommentReady) {
      return;
    }

    this.setState({
      isCommentLoading: true,
    });
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      page: this.page,
      perPage: this.perPage,
      sort: this.commentDataSort ? 'createdAt' : '-createdAt',
    };

    const { success, msg } = await this.props.thread.loadCommentList(params);
    this.setState({
      isCommentLoading: false,
    });
    if (success) {
      return true;
    }
    Toast.error({
      content: msg,
    });
  }

  // 列表排序
  onSortChange(isCreateAt) {
    this.commentDataSort = isCreateAt;
    this.page = 1;
    return this.loadCommentList();
  }

  // 点击评论
  onInputClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '请先登录!' });
      return;
    }

    this.setState({
      showCommentInput: true,
    });
  }

  // 点击更多icon
  onMoreClick = () => {
    console.log('更多');
    // this.setState({
    //   text: !this.state.text,
    // });
    this.setState({ showMorePopup: true });
  };

  onOperClick = (type) => {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '请先登录!' });
      return;
    }

    this.setState({ showMorePopup: false });

    // 举报
    if (type === 'stick') {
      this.updateStick();
    }

    // 加精
    if (type === 'essence') {
      this.updateEssence();
    }

    // 删除
    if (type === 'delete') {
      this.setState({ showDeletePopup: true });
    }

    // 编辑
    if (type === 'edit') {
      if (!this.props.thread?.threadData?.id) return;
      this.props.router.push(`/thread/post?id=${this.props.thread?.threadData?.id}`);
    }

    // 举报
    if (type === 'report') {
      this.setState({ showReportPopup: true });
    }
  };

  // 确定举报
  async onReportOk(val) {
    if (!val) return;

    const params = {
      threadId: this.props.thread.threadData.threadId,
      type: 1,
      reason: val,
      userId: this.props.user.userInfo.id,
    };
    const { success, msg } = await this.props.thread.createReports(params);

    if (success) {
      Toast.success({
        content: '操作成功',
      });

      this.setState({ showReportPopup: false });
      return true;
    }

    Toast.error({
      content: msg,
    });
  }

  // 置顶提示
  setTopState(isStick) {
    this.setState({
      showContent: isStick,
      setTop: !this.state.setTop,
    });
    setTimeout(() => {
      this.setState({ setTop: !this.state.setTop });
    }, 2000);
  }

  // 置顶接口
  async updateStick() {
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      isStick: !this.props.thread?.threadData?.isStick,
    };
    const { success, msg } = await this.props.thread.updateStick(params);

    if (success) {
      this.setTopState(true);
      return;
    }

    Toast.error({
      content: msg,
    });
  }

  // 加精接口
  async updateEssence() {
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      isEssence: !this.props.thread?.threadData?.displayTag?.isEssence,
    };
    const { success, msg } = await this.props.thread.updateEssence(params);

    if (success) {
      Toast.success({
        content: '操作成功',
      });
      return;
    }

    Toast.error({
      content: msg,
    });
  }

  // 帖子删除接口
  async delete() {
    this.setState({ showDeletePopup: false });
    const id = this.props.thread?.threadData?.id;

    const { success, msg } = await this.props.thread.delete(id, this.props.index);

    if (success) {
      Toast.success({
        content: '删除成功，即将跳转至首页',
      });

      setTimeout(() => {
        this.props.router.push('/');
      }, 1000);

      return;
    }

    Toast.error({
      content: msg,
    });
  }

  onBtnClick() {
    this.delete();
    this.setState({ showDeletePopup: false });
  }

  // 点击发布按钮
  async onPublishClick(val) {
    if (!val) return;
    return this.comment ? await this.updateComment(val) : await this.createComment(val);
  }

  // 创建评论
  async createComment(val) {
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      content: val,
      sort: this.commentDataSort, // 目前的排序
      isNoMore: false,
      attachments: [],
    };
    const { success, msg } = await this.props.comment.createComment(params, this.props.thread);
    if (success) {
      Toast.success({
        content: '评论成功',
      });
      this.setState({
        showCommentInput: false,
      });
      return true;
    }
    Toast.error({
      content: msg,
    });
  }

  // 更新评论
  async updateComment(val) {
    if (!this.comment) return;

    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      pid: this.comment.id,
      content: val,
      attachments: [],
    };
    const { success, msg } = await this.props.comment.updateComment(params, this.props.thread);
    if (success) {
      Toast.success({
        content: '修改成功',
      });
      this.setState({
        showCommentInput: false,
      });
      return true;
    }
    Toast.error({
      content: msg,
    });
  }

  // 点击编辑评论
  onEditClick(comment) {
    this.comment = comment;
    this.setState({
      inputValue: comment.content,
      showCommentInput: true,
    });
  }

  // 弹出框关闭
  onClose() {
    this.setState({
      showCommentInput: false,
    });
    this.comment = null;
  }

  // 点赞
  async onLikeClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '请先登录!' });
      return;
    }

    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      pid: this.props.thread?.threadData?.postId,
      isLiked: !this.props.thread?.threadData?.isLike,
    };
    const { success, msg } = await this.props.thread.updateLiked(params, this.props.index, this.props.user);

    if (!success) {
      Toast.error({
        content: msg,
      });
    }
  }

  // 分享
  async onShareClick() {
    Toast.info({ content: '复制链接成功' });

    const { title = '' } = this.props.thread?.threadData || {};
    h5Share(title);

    // const id = this.props.thread?.threadData?.id;

    // const { success, msg } = await this.props.thread.shareThread(id);

    // if (!success) {
    //   Toast.error({
    //     content: msg,
    //   });
    // }
  }

  // 点击打赏
  onRewardClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '请先登录!' });
      return;
    }

    this.setState({ showRewardPopup: true });
  }

  // 确认打赏
  async onRewardSubmit(value) {
    if (!isNaN(Number(value)) && this.props.thread?.threadData?.threadId && this.props.thread?.threadData?.userId) {
      this.setState({ showRewardPopup: false });
      const params = {
        amount: Number(value),
        threadId: this.props.thread.threadData.threadId,
        payeeId: this.props.thread.threadData.userId,
      };

      const { success } = await rewardPay(params);

      // 支付成功重新请求帖子数据
      if (success && this.props.thread?.threadData?.threadId) {
        this.props.thread.fetchThreadDetail(this.props.thread?.threadData?.threadId);
      }
    }
  }

  // 点击标签 TODO:带上参数
  onTagClick() {
    this.props.router.push('/');
  }

  render() {
    const { thread: threadStore } = this.props;
    const { isReady, isCommentReady, isNoMore, totalCount } = threadStore;
    const fun = {
      moreClick: this.onMoreClick,
    };

    // 更多弹窗权限
    const morePermissions = {
      canEdit: threadStore?.threadData?.ability?.canEdit,
      canDelete: threadStore?.threadData?.ability?.canDelete,
      canEssence: threadStore?.threadData?.ability?.canEssence,
      canStick: threadStore?.threadData?.ability?.canStick,
    };
    // 更多弹窗界面
    const moreStatuses = {
      isEssence: threadStore?.threadData?.displayTag?.isEssence,
      isStick: threadStore?.threadData?.isStick,
    };

    const isApproved = threadStore?.threadData?.isApproved || 0;

    return (
      <div className={layout.container}>
        <div className={layout.header}>
          <Header></Header>
          {isReady && isApproved !== 1 && (
            <div className={layout.examine}>内容正在审核中，审核通过后才能正常显示！</div>
          )}
        </div>

        <div
          className={layout.body}
          ref={this.threadBodyRef}
          onScrollCapture={() => throttle(this.handleOnScroll(), 500)}
        >
          <ShowTop showContent={this.state.showContent} setTop={this.state.setTop}></ShowTop>
          {/* 帖子内容 */}
          {isReady ? (
            <RenderThreadContent
              store={threadStore}
              fun={fun}
              onLikeClick={() => this.onLikeClick()}
              onOperClick={(type) => this.onOperClick(type)}
              onCollectionClick={() => this.onCollectionClick()}
              onShareClick={() => this.onShareClick()}
              onReportClick={() => this.onReportClick()}
              onContentClick={() => this.onContentClick()}
              onRewardClick={() => this.onRewardClick()}
              onTagClick={() => this.onTagClick()}
            ></RenderThreadContent>
          ) : (
            <LoadingTips type="init"></LoadingTips>
          )}

          {/* 评论列表 */}
          <div className={`${layout.bottom}`} ref={this.commentDataRef}>
            {isCommentReady ? (
              <Fragment>
                <RenderCommentList
                  router={this.props.router}
                  sort={(flag) => this.onSortChange(flag)}
                  onEditClick={(comment) => this.onEditClick(comment)}
                ></RenderCommentList>
                {this.state.isCommentLoading && <LoadingTips></LoadingTips>}
                {isNoMore && <NoMore empty={totalCount === 0}></NoMore>}
              </Fragment>
            ) : (
              <LoadingTips type="init"></LoadingTips>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className={layout.footer}>
          {/* 评论区触发 */}
          <div className={footer.inputClick} onClick={() => this.onInputClick()}>
            <Input className={footer.input} placeholder="写评论" disabled={true} prefixIcon="EditOutlined"></Input>
          </div>

          {/* 评论弹层 */}
          <InputPopup
            visible={this.state.showCommentInput}
            onClose={() => this.onClose()}
            initValue={this.state.inputValue}
            onSubmit={(value) => this.onPublishClick(value)}
          ></InputPopup>

          {/* 更多弹层 */}
          <MorePopup
            permissions={morePermissions}
            statuses={moreStatuses}
            visible={this.state.showMorePopup}
            onClose={() => this.setState({ showMorePopup: false })}
            onSubmit={() => this.setState({ showMorePopup: false })}
            onOperClick={(type) => this.onOperClick(type)}
          ></MorePopup>

          {/* 删除弹层 */}
          <DeletePopup
            visible={this.state.showDeletePopup}
            onClose={() => this.setState({ showDeletePopup: false })}
            onBtnClick={(type) => this.onBtnClick(type)}
          ></DeletePopup>
          {/* 举报弹层 */}

          <ReportPopup
            reportContent={this.reportContent}
            inputText={this.inputText}
            visible={this.state.showReportPopup}
            onCancel={() => this.setState({ showReportPopup: false })}
            onOkClick={(data) => this.onReportOk(data)}
          ></ReportPopup>

          {/* 打赏弹窗 */}
          <RewardPopup
            visible={this.state.showRewardPopup}
            onCancel={() => this.setState({ showRewardPopup: false })}
            onOkClick={(value) => this.onRewardSubmit(value)}
          ></RewardPopup>

          {/* 操作区 */}
          <div className={footer.operate}>
            <div className={footer.icon} onClick={() => this.onMessageClick()}>
              {totalCount > 0 ? (
                <div className={footer.badge}>{totalCount > 99 ? '99+' : `${totalCount || '0'}`}</div>
              ) : (
                ''
              )}
              <Icon size="20" name="MessageOutlined"></Icon>
            </div>
            <Icon
              color={this.props.thread?.isFavorite ? styleVar['--color-primary'] : ''}
              className={footer.icon}
              onClick={() => this.onCollectionClick()}
              size="20"
              name="CollectOutlined"
            ></Icon>
            <Icon onClick={() => this.onShareClick()} className={footer.icon} size="20" name="ShareAltOutlined"></Icon>
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(ThreadH5Page);
