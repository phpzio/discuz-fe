import React, { Fragment } from 'react';
import { inject, observer } from 'mobx-react';
import { View, Text, ScrollView, Image } from '@tarojs/components';

import Taro, { eventCenter, getCurrentInstance } from '@tarojs/taro';

import layout from './layout.module.scss';
import footer from './footer.module.scss';

import NoMore from './components/no-more';
import LoadingTips from './components/loading-tips';
// import styleVar from '@common/styles/theme/default.scss.json';
import Icon from '@discuzq/design/dist/components/icon/index';
import Input from '@discuzq/design/dist/components/input/index';
import Toast from '@components/toast';
import Button from '@discuzq/design/dist/components/button/index';
import goToLoginPage from '@common/utils/go-to-login-page';

import AboptPopup from './components/abopt-popup';
import ReportPopup from './components/report-popup';
import ShowTop from './components/show-top';
import DeletePopup from './components/delete-popup';
import MorePopup from './components/more-popup';
import InputPopup from './components/input-popup';
import BottomView from '@components/list/BottomView';
import throttle from '@common/utils/thottle';
import PacketOpen from '@components/red-packet-animation';

import threadPay from '@common/pay-bussiness/thread-pay';
import RewardPopup from './components/reward-popup';
import RenderThreadContent from './detail/content';
import RenderCommentList from './detail/comment-list';
import classNames from 'classnames';
import { debounce } from '@common/utils/throttle-debounce';
import styles from './post/index.module.scss';
import Router from '@discuzq/sdk/dist/router';
import canPublish from '@common/utils/can-publish';
import { parseContentData } from './utils';
import { IMG_SRC_HOST } from '@common/constants/site';

const hongbaoMini = `${IMG_SRC_HOST}/assets/redpacket-mini.10b46eefd630a5d5d322d6bbc07690ac4536ee2d.png`;

@inject('site')
@inject('user')
@inject('thread')
@inject('commentPosition')
@inject('comment')
@inject('index')
@inject('payBox')
@observer
class ThreadH5Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showAboptPopup: false, // ????????????????????????
      isShowShare: false, // ??????????????????????????????
      showReportPopup: false, // ????????????????????????
      showDeletePopup: false, // ????????????????????????
      showCommentInput: false, // ?????????????????????
      showMorePopup: false, // ?????????????????????
      showRewardPopup: false, // ????????????
      isCommentLoading: false, // ??????loading
      setTop: false, // ??????
      showContent: '',
      // inputValue: '', // ????????????
      inputText: '???????????????', // ???????????????placeholder??????
      toView: '', // ????????????id??????????????????
      stateFlag: true,
    };

    this.perPage = 20;
    this.commentDataSort = true;

    // ????????????????????????
    this.position = 0;
    this.threadBodyRef = React.createRef();
    this.commentDataRef = React.createRef();
    this.nextPosition = 0;
    this.flag = true;
    this.currentPosition = 0;

    // ??????????????????
    this.comment = null;

    this.commentData = null;
    this.replyData = null;
    this.commentType = null;

    // ??????????????????
    this.reportContent = ['????????????', '????????????', '????????????', '????????????'];
    this.inputText = '????????????...';
    this.$instance = getCurrentInstance()

    this.positionRef = React.createRef();
    this.isPositioned = false;
  }

  componentWillMount() {
    const onShowEventId = this.$instance.router.onShow
    // ??????
    eventCenter.on(onShowEventId, this.onShow.bind(this))
  }
  componentDidMount() {
    // ?????????????????????????????????????????????????????????
    // this.position = this.commentDataRef?.current?.offsetTop - 50;
    // ???????????????????????????
    if (this.props?.thread?.isPositionToComment) {
      // TODO:??????????????????????????????????????????
      setTimeout(() => {
        this.onMessageClick();
      }, 1200);
    }
  }

  componentDidUpdate() {
    // ?????????????????????????????????????????????????????????
    if (this.props.thread.isReady) {
      // this.position = this.commentDataRef?.current?.offsetTop - 50;

      const { id, title } = this.props?.thread?.threadData;

      if (id) {
        // ??????????????????
        this.shareData = {
          comeFrom: 'thread',
          threadId: id,
          title,
          path: `/indexPages/thread/index?id=${id}`,
        };
      }
    }

    // ????????????????????????????????????
    if (this.props.commentPosition?.postId && !this.isPositioned && this.positionRef?.current) {
      this.isPositioned = true;
      setTimeout(() => {
        this.setState({
          toView: `position${this.props.commentPosition?.postId}`,
        });
      }, 1000);
    }
  }

  componentWillUnmount() {
    // ????????????
    this.props?.thread && this.props.thread.reset();
    // ????????????????????????
    this.props?.payBox?.hide();
    // ??????@ren??????
    this.props.thread.setCheckUser([]);
    const onShowEventId = this.$instance.router.onShow
    // ??????
    eventCenter.off(onShowEventId, this.onShow)
  }

  // ????????????
  handleOnScroll = (e) => {
    // ??????????????????
    if (this.state.toView !== '') {
      this.setState({ toView: '' });
    }

    if (this.flag) {
      this.nextPosition = 0;
    }
    this.currentPosition = e.detail?.scrollTop || 0;

    // ???????????????
    const { scrollLeft, scrollTop, scrollHeight, scrollWidth, deltaX, deltaY } = e.detail;
    if (scrollTop * 3 > scrollHeight) {
      const id = this.props.thread?.threadData?.id;
      const params = {
        id,
        page: this.props.thread.page + 1,
        perPage: this.perPage,
        sort: this.commentDataSort ? 'createdAt' : '-createdAt',
      };

      this.props.thread.preFetch(params);
    }
  };

  // ????????????
  scrollToLower = () => {
    const { isCommentReady, isNoMore } = this.props.thread;
    if (!this.state.isCommentLoading && isCommentReady && !isNoMore) {
      this.props.thread.setCommentListPage(this.props.thread.page + 1);
      this.loadCommentList();
    }
  };

  // ????????????icon
  onMessageClick() {
    this.setState({ toView: 'commentId' });
    if (this.flag) {
      this.flag = !this.flag;
    } else {
      if (this.position <= 0) {
        this.position = this.nextPosition + 1;
      } else {
        this.position = this.nextPosition - 1;
      }
      this.flag = !this.flag;
    }
    this.setState({ stateFlag: this.flag })
  }

  // ????????????icon
  async onCollectionClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
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
        content: params.isFavorite ? '????????????' : '????????????',
      });
      return;
    }

    Toast.error({
      content: msg,
    });
  }

  // ???????????????????????????
  async loadCommentList() {
    const { isCommentReady, isCommentListError } = this.props.thread;
    if (this.state.isCommentLoading || (!isCommentReady && !isCommentListError)) {
      return;
    }

    this.setState({
      isCommentLoading: true,
    });
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      page: this.props.thread.page,
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

  // ??????????????????
  onLoadMoreClick() {
    this.props.commentPosition.page = this.props.commentPosition.page + 1;
    this.loadCommentPositionList();
  }

  // ???????????????????????????
  async loadCommentPositionList() {
    const { isCommentReady } = this.props.commentPosition;
    if (this.state.isCommentLoading || !isCommentReady) {
      return;
    }

    this.setState({
      isCommentLoading: true,
    });
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      page: this.props?.commentPosition?.page || 1,
      perPage: this.perPage,
      sort: this.commentDataSort ? 'createdAt' : '-createdAt',
    };

    const { success, msg } = await this.props.commentPosition.loadCommentList(params);
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

  // ????????????
  onSortChange(isCreateAt) {
    this.commentDataSort = isCreateAt;
    this.props.thread.setCommentListPage(1);
    this.props.commentPosition.reset();
    return this.loadCommentList();
  }

  // ????????????
  onInputClick() {
    const {user, site, thread } = this.props;
    if (!user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }
    if(!canPublish(user, site, 'reply', thread?.threadData?.threadId)) return;
    this.commentType = 'comment';

    this.setState({
      showCommentInput: true,
      inputText: '???????????????',
    });
  }

  // ????????????icon
  onMoreClick = () => {
    // this.setState({
    //   text: !this.state.text,
    // });
    this.setState({
      isShowShare: false,
      showMorePopup: true,
    });
  };

  // ????????????
  onShareClick = () => {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }

    this.setState({
      isShowShare: true,
      showMorePopup: true,
    });
  };

  onOperClick = (type) => {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }

    this.setState({ showMorePopup: false });

    // ??????
    if (type === 'stick') {
      this.updateStick();
    }

    // ??????
    if (type === 'essence') {
      this.updateEssence();
    }

    // ??????
    if (type === 'delete') {
      this.setState({ showDeletePopup: true });
    }

    // ??????
    if (type === 'edit') {
      if (!this.props.thread?.threadData?.id) return;
      Taro.redirectTo({
        url: `/indexPages/thread/post/index?id=${this.props.thread?.threadData?.id}}`,
      });
    }

    // ??????
    if (type === 'report') {
      this.setState({ showReportPopup: true });
    }

    // ??????
    if (type === 'collect') {
      this.onCollectionClick();
    }

    // ????????????
    if (type === 'posterShare') {
      this.onPosterShare();
    }

    // wx??????
    if (type === 'wxShare') {
      this.onWxShare();
    }
  };

  // ????????????
  async onPosterShare() {
    const threadId = this.props.thread?.threadData?.id;
    const threadData = this.props.thread?.threadData;

    const { success, msg } = await this.props.thread.shareThread(threadId, this.props.index, this.props.search, this.props.topic);
    if (!success) {
      Toast.error({
        content: msg,
      });
    }
    Taro.eventCenter.once('page:init', () => {
      Taro.eventCenter.trigger('message:detail', threadData);
    });
    Taro.navigateTo({
      url: `/subPages/create-card/index?threadId=${threadId}`,
    });
  }

  // wx??????
  onWxShare() {
    const { thread, user } = this.props
    const { nickname } = thread.threadData?.user || ''
    const { avatar } = thread.threadData?.user || ''
    const threadId = thread?.threadData?.id
    if (thread.threadData?.isAnonymous) {
      user.getShareData({ nickname, avatar, threadId })
      thread.threadData.user.nickname = '????????????'
      thread.threadData.user.avatar = ''
    }
  }
  onShow() {
    const { thread, user } = this.props
    if (user.shareThreadid === thread?.threadData?.id) {
      if (thread.threadData?.isAnonymous) {
        thread.threadData.user.nickname = user.shareNickname
        thread.threadData.user.avatar = user.shareAvatar
        user.getShareData({})
      }
    }
  }
  // ????????????
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
        content: '????????????',
      });

      this.setState({ showReportPopup: false });
      return true;
    }

    Toast.error({
      content: msg,
    });
  }

  // ????????????
  setTopState(isStick) {
    this.setState({
      showContent: isStick,
      setTop: !this.state.setTop,
    });
    setTimeout(() => {
      this.setState({ setTop: !this.state.setTop });
    }, 2000);
  }

  // ????????????
  async updateStick() {
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      isStick: !this.props.thread?.threadData?.isStick,
    };
    const { success, msg } = await this.props.thread.updateStick(params);

    if (success) {
      this.setTopState(params.isStick);
      // TODO:????????????????????????
      this.props.index.screenData({});
      return;
    }

    Toast.error({
      content: msg,
    });
  }

  // ????????????
  async updateEssence() {
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      isEssence: !this.props.thread?.threadData?.displayTag?.isEssence,
    };
    const { success, msg } = await this.props.thread.updateEssence(params);

    if (success) {
      Toast.success({
        content: '????????????',
      });
      return;
    }

    Toast.error({
      content: msg,
    });
  }

  // ??????????????????
  async delete() {
    this.setState({ showDeletePopup: false });
    const id = this.props.thread?.threadData?.id;

    const { success, msg } = await this.props.thread.delete(id);

    if (success) {
      Toast.success({
        content: '???????????????????????????????????????',
      });
      this.props.index.deleteThreadsData({ id }, this.props.site);
      setTimeout(() => {
        Taro.navigateBack({
          delta: 1,
          fail:()=>{
            Taro.navigateTo({
              url: '/indexPages/home/index',
            });
          }
        });
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

  // ??????????????????
  async publishClick(data) {
    if (this.commentType === 'comment') {
      return await this.onPublishClick(data);
    }
    if (this.commentType === 'reply') {
      return await this.createReply(data);
    }
  }

  // ????????????
  async onPublishClick(data) {
    return this.comment ? await this.updateComment(data) : await this.createComment(data);
  }

  // ????????????
  async createComment({ val, imageList, captchaTicket, captchaRandStr }) {
    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      content: val,
      sort: this.commentDataSort, // ???????????????
      isNoMore: this.props?.thread?.isNoMore,
      attachments: [],
      captchaTicket,
      captchaRandStr,
    };

    if (imageList?.length) {
      params.attachments = imageList
        .filter((item) => item.status === 'success' && item.response)
        .map((item) => {
          const { id } = item.response;
          return {
            id,
            type: 'attachments',
          };
        });
    }

    const { success, msg, isApproved, redPacketAmount } = await this.props.comment.createComment(params, this.props.thread);
    if (success) {
      // ??????????????????????????????
      this.props.thread.updatePostCount(this.props.thread.totalCount);

      // ???????????????
      const isRedPack = this.props.thread?.threadData?.displayTag?.isRedPack;
      // TODO:??????????????????????????????????????????????????????
      if (isRedPack) {
        // ??????????????????????????????????????????
        await this.props.thread.fetchThreadDetail(id);
      }

      if (redPacketAmount && redPacketAmount > 0) {
        this.props.thread.setRedPacket(redPacketAmount);
      }

      // ????????????store??????
      this.props.thread.updateListStore();

      if (isApproved) {
        Toast.success({
          content: msg,
        });
      } else {
        Toast.warning({
          content: msg,
        });
      }
      this.setState({
        showCommentInput: false,
      });
      return true;
    }
    Toast.error({
      content: msg,
    });
  }

  // ????????????
  async updateComment({val, captchaTicket = '', captchaRandStr = '' }) {
    if (!this.comment) return;

    const id = this.props.thread?.threadData?.id;
    const params = {
      id,
      postId: this.comment.id,
      content: val,
      attachments: [],
      captchaTicket,
      captchaRandStr,
    };
    const { success, msg, isApproved } = await this.props.comment.updateComment(params, this.props.thread);
    if (success) {
      if (isApproved) {
        Toast.success({
          content: msg,
        });
      } else {
        Toast.warning({
          content: msg,
        });
      }
      this.setState({
        showCommentInput: false,
      });
      return true;
    }
    Toast.error({
      content: msg,
    });
  }

  // ?????????????????????
  replyClick(comment) {
    const {user, site, thread } = this.props;
    if (!user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }
    if(!canPublish(user, site, 'reply', thread?.threadData?.threadId)) return;
    this.commentType = 'reply';

    this.commentData = comment;
    this.replyData = null;
    const userName = comment?.user?.nickname || comment?.user?.userName;
    this.setState({
      showCommentInput: true,
      inputText: userName ? `??????${userName}` : '???????????????',
    });
  }

  // ?????????????????????
  replyReplyClick(reply, comment) {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }
    this.commentType = 'reply';

    this.commentData = null;
    this.replyData = reply;
    this.replyData.commentId = comment.id;
    const userName = reply?.user?.nickname || reply?.user?.userName;

    this.setState({
      showCommentInput: true,
      inputText: userName ? `??????${userName}` : '???????????????',
    });
  }

  // ??????????????????+??????????????????
  async createReply({val = '', imageList = [], captchaTicket = '', captchaRandStr = ''}) {
    if (!val && imageList.length === 0) {
      Toast.info({ content: '???????????????!' });
      return;
    }

    const id = this.props.thread?.threadData?.id;
    if (!id) return;

    const params = {
      id,
      content: val,
      captchaTicket,
      captchaRandStr,
    };

    // ???????????????
    if (this.replyData) {
      params.replyId = this.replyData.id;
      params.isComment = true;
      params.commentId = this.replyData.commentId;
      params.commentPostId = this.replyData.id;
    }
    // ????????????
    if (this.commentData) {
      params.replyId = this.commentData.id;
      params.isComment = true;
      params.commentId = this.commentData.id;
    }

    if (imageList?.length) {
      params.attachments = imageList
        .filter((item) => item.status === 'success' && item.response)
        .map((item) => {
          const { id } = item.response;
          return {
            id,
            type: 'attachments',
          };
        });
    }

    const { success, msg, isApproved } = await this.props.comment.createReply(params, this.props.thread);

    if (success) {
      this.setState({
        showCommentInput: false,
        inputValue: '',
      });
      if (isApproved) {
        Toast.success({
          content: msg,
        });
      } else {
        Toast.warning({
          content: msg,
        });
      }
      return true;
    }

    Toast.error({
      content: msg,
    });
  }

  replyAvatarClick(reply, comment, floor) {
    if (floor === 2) {
      const { userId } = reply;
      if (!userId) return;
      Router.push({ url: `/userPages/user/index?id=${userId}` });
    }
    if (floor === 3) {
      const { commentUserId } = reply;
      if (!commentUserId) return;
      Router.push({ url: `/userPages/user/index?id=${commentUserId}` });
    }
  }

  // ???????????????
  onClose() {
    this.setState({
      showCommentInput: false,
    });
    this.comment = null;
  }

  // ??????
  async onLikeClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
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

  // ????????????
  async onPayClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }

    const thread = this.props.thread.threadData;
    const { success } = await threadPay(thread, this.props.user?.userInfo);

    // ????????????????????????????????????
    if (success && this.props.thread?.threadData?.threadId) {
      await this.props.thread.fetchThreadDetail(this.props.thread?.threadData?.threadId);
      // ????????????store??????
      this.props.thread.updateListStore();
    }
  }

  // ????????????
  onRewardClick() {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }

    this.setState({ showRewardPopup: true });
  }

  // ????????????
  async onRewardSubmit(value) {
    if (!isNaN(Number(value)) && this.props.thread?.threadData?.threadId && this.props.thread?.threadData?.userId) {
      this.setState({ showRewardPopup: false });
      const params = {
        amount: Number(value),
        threadId: this.props.thread.threadData.threadId,
        payeeId: this.props.thread.threadData.userId,
        title: this.props.thread?.threadData?.title || '????????????',
      };

      const { success, msg } = await this.props.thread.rewardPay(
        params,
        this.props.user
      );

      if (!success) {
        Toast.error({
          content: msg,
        });
      }
    }
  }

  // ???????????? TODO:????????????
  onTagClick() {
    // TODO:????????????????????????????????????????????????????????????
    const categoryId = this.props.thread?.threadData?.categoryId;
    if (categoryId || typeof categoryId === 'number') {
      this.props.index.refreshHomeData({ categoryIds: [categoryId] });
    }
    Taro.redirectTo({
      url: '/indexPages/home/index',
    });
  }

  // ????????????
  onAboptClick(data) {
    if (!this.props.user.isLogin()) {
      Toast.info({ content: '????????????!' });
      goToLoginPage({ url: '/userPages/user/wx-auth/index' });
      return;
    }

    this.commentData = data;
    this.setState({ showAboptPopup: true });
  }

  // ??????????????????
  async onAboptOk(data) {
    if (data > 0) {
      const params = {
        postId: this.commentData?.id,
        rewards: data,
        threadId: this.props.thread?.threadData?.threadId,
      };
      const { success, msg } = await this.props.thread.reward(params);
      if (success) {
        this.setState({ showAboptPopup: false });

        // ????????????????????????
        await this.props.thread.fetchThreadDetail(params.threadId);
        this.props.thread.updateListStore();

        Toast.success({
          content: `??????${data}???`,
        });
        return true;
      }

      Toast.error({
        content: msg,
      });
    } else {
      Toast.info({
        content: '?????????????????????0',
      });
    }
  }

  // ??????????????????
  onAboptCancel() {
    this.commentData = null;
    this.setState({ showAboptPopup: false });
  }

  onRetryClick() {
    this.loadCommentList()
  }

  render() {
    const { thread: threadStore } = this.props;
    const { isReady, isCommentReady, isNoMore, totalCount, isCommentListError } = threadStore;
    const { hasRedPacket } = threadStore; // ??????????????????????????????

    const fun = {
      moreClick: this.onMoreClick,
    };

    const { indexes } = this.props.thread?.threadData?.content || {};
    const parseContent = parseContentData(indexes);
    const hasHongbao = parseContent?.RED_PACKET?.condition===0 && parseContent?.RED_PACKET?.remainNumber>0; // ?????????????????????????????????

    // const isDraft = threadStore?.threadData?.isDraft;
    // // ???????????????
    // const isRedPack = threadStore?.threadData?.displayTag?.isRedPack;
    // // ???????????????
    // const isReward = threadStore?.threadData?.displayTag?.isReward;

    // ??????????????????
    const morePermissions = {
      // ??????????????? && ??????????????? && ??????????????? && ?????????????????? || ???????????? && ??????????????????
      // canEdit:
      //   (!isDraft && threadStore?.threadData?.ability?.canEdit && !isRedPack && !isReward)
      //   || (isDraft && threadStore?.threadData?.ability?.canEdit),
      canEdit: threadStore?.threadData?.ability?.canEdit, // ?????????????????????????????????????????????????????????????????????
      canDelete: threadStore?.threadData?.ability?.canDelete,
      canEssence: threadStore?.threadData?.ability?.canEssence,
      canStick: threadStore?.threadData?.ability?.canStick,
      canShare: this.props.user.isLogin(),
      canCollect: this.props.user.isLogin(),
      isAdmini: this.props?.user?.isAdmini,
    };

    // ??????????????????
    const moreStatuses = {
      isEssence: threadStore?.threadData?.displayTag?.isEssence,
      isStick: threadStore?.threadData?.isStick,
      isCollect: threadStore?.isFavorite,
    };

    // ??????????????????
    const isApproved = (threadStore?.threadData?.isApproved || 0) === 1;

    // ??????????????????
    const { isShowCommentList, isNoMore: isCommentPositionNoMore } = this.props.commentPosition;

    return (
      <View className={layout.container}>
        <View className={layout.header}>
          {/* <Header></Header> */}
          {isReady && !isApproved && (
            <View className={layout.examine}>
              <Icon className={layout.tipsIcon} name="TipsOutlined"></Icon>
              <Text className={layout.tipsText}>????????????????????????????????????????????????????????????</Text>
            </View>
          )}
        </View>
        <ScrollView
          className={layout.body}
          ref={this.hreadBodyRef}
          id="hreadBodyId"
          scrollY
          scrollTop={this.position}
          lowerThreshold={50}
          onScrollToLower={this.props.index.hasOnScrollToLower ? () => this.scrollToLower() : null}
          scrollIntoView={this.state.toView}
          onScroll={(e) => throttle(this.handleOnScroll(e), 200)}
        >
          <View className={layout['view-inner']}>
            <ShowTop showContent={this.state.showContent} setTop={this.state.setTop}></ShowTop>
            {/* ???????????? */}
            {isReady ? (
              <RenderThreadContent
                store={threadStore}
                fun={fun}
                onLikeClick={debounce(() => this.onLikeClick(), 500)}
                onOperClick={(type) => this.onOperClick(type)}
                onCollectionClick={debounce(() => this.onCollectionClick(), 500)}
                onReportClick={() => this.onReportClick()}
                onContentClick={debounce(() => this.onContentClick(), 500)}
                onRewardClick={() => this.onRewardClick()}
                onTagClick={() => this.onTagClick()}
                onPayClick={() => this.onPayClick()}
              ></RenderThreadContent>
            ) : (
              <LoadingTips type="init"></LoadingTips>
            )}

            {/* ???????????? */}
            {isReady && isApproved && (
              <View className={`${layout.bottom}`} ref={this.commentDataRef} id="commentId">
                {isCommentReady ? (
                  <Fragment>
                    {/* ??????????????? */}
                    {isCommentReady && isShowCommentList && (
                      <Fragment>
                        <RenderCommentList
                          isPositionComment
                          router={this.props.router}
                          sort={(flag) => this.onSortChange(flag)}
                          replyAvatarClick={(comment, reply, floor) => this.replyAvatarClick(comment, reply, floor)}
                        ></RenderCommentList>
                        {!isCommentPositionNoMore && (
                          <View className={layout.showMore} onClick={() => this.onLoadMoreClick()}>
                            <View className={layout.hidePercent}>??????????????????</View>
                            <Icon className={layout.icon} name="RightOutlined" size={12} />
                          </View>
                        )}
                      </Fragment>
                    )}

                    <RenderCommentList
                      positionRef={this.positionRef}
                      showHeader={!isShowCommentList}
                      router={this.props.router}
                      sort={(flag) => this.onSortChange(flag)}
                      replyReplyClick={(reply, comment) => this.replyReplyClick(reply, comment)}
                      replyClick={(comment) => this.replyClick(comment)}
                      replyAvatarClick={(comment, reply, floor) => this.replyAvatarClick(comment, reply, floor)}
                      onAboptClick={(data) => this.onAboptClick(data)}
                    ></RenderCommentList>
                    <View className={layout.noMore}>
                      <BottomView type="line" isError={isCommentListError} noMore={isNoMore}></BottomView>
                    </View>
                  </Fragment>
                ) : (
                  <LoadingTips isError={isCommentListError} type="init" onErrorClick={() => this.onRetryClick()}></LoadingTips>
                )}
              </View>
            )}
             {/* ??????????????? */}
              {isReady && isApproved && (
                <View className={classNames(layout.footerContainer, this.state.showCommentInput && layout.zindex)}>
                  <View className={classNames(layout.footer, this.state.showCommentInput && layout.zindex)}>
                    {/* ??????????????? */}
                    <View
                      className={classNames(footer.inputClick, hasHongbao && footer.hasHongbao)}
                      onClick={() => this.onInputClick()}
                    >
                      {hasHongbao && <Image className={footer.hongbaoMini} src={hongbaoMini}></Image>}
                      <Input
                        className={footer.input}
                        placeholder="?????????"
                        disabled
                        prefixIcon="EditOutlined"
                        placeholderClass={footer.inputPlaceholder}
                      ></Input>
                    </View>

                    {/* ????????? */}
                    <View className={footer.operate}>
                      <View className={footer.icon} onClick={() => this.onMessageClick()}>
                        {this.state.stateFlag ?
                          totalCount > 0 ? (
                            <View className={classNames(footer.badge, totalCount < 10 && footer.isCricle)}>
                              {totalCount > 99 ? '99+' : `${totalCount || '0'}`}
                            </View>
                          ) : (
                            ''
                          ) : (
                            <View className={footer.content}>
                              ??????
                            </View>
                          )}
                        <Icon size="20" name="MessageOutlined"></Icon>
                      </View>
                      <Icon
                        className={classNames(footer.icon, {
                          [footer.isliked]: this.props.thread?.threadData?.isLike,
                        })}
                        onClick={debounce(() => this.onLikeClick(), 500)}
                        size="20"
                        name="LikeOutlined"
                      ></Icon>
                      <Icon
                        className={classNames(footer.icon, {
                          [footer.isliked]: this.props.thread?.isFavorite,
                        })}
                        onClick={debounce(() => this.onCollectionClick(), 500)}
                        size="20"
                        name="CollectOutlinedBig"
                      ></Icon>

                      {/* ??????button */}
                      <View className={classNames(footer.share, footer.icon)} onClick={() => this.onShareClick()}>
                        <Icon className={footer.icon} size="20" name="ShareAltOutlined"></Icon>
                      </View>
                    </View>
                  </View>
                </View>
              )}

          </View>
        </ScrollView>

        {isReady && (
          <Fragment>
            {/* ???????????? */}
            <InputPopup
              mark={'detail'}
              inputText={this.state.inputText}
              visible={this.state.showCommentInput}
              onClose={() => this.onClose()}
              initValue={this.state.inputValue}
              onSubmit={data => this.publishClick(data)}
              site={this.props.site}
              checkUser={this.props?.thread?.checkUser || []}
              thread={this.props?.thread}
            ></InputPopup>

            {/* ???????????? */}
            <MorePopup
              shareData={this.shareData}
              permissions={morePermissions}
              statuses={moreStatuses}
              visible={this.state.showMorePopup}
              onClose={() => this.setState({ showMorePopup: false })}
              onSubmit={() => this.setState({ showMorePopup: false })}
              onOperClick={(type) => this.onOperClick(type)}
              isShowShare={this.state.isShowShare}
            ></MorePopup>

            {/* ???????????? */}
            <DeletePopup
              visible={this.state.showDeletePopup}
              onClose={() => this.setState({ showDeletePopup: false })}
              onBtnClick={(type) => this.onBtnClick(type)}
              type="thread"
            ></DeletePopup>

            {/* ???????????? */}
            <ReportPopup
              reportContent={this.reportContent}
              inputText={this.inputText}
              visible={this.state.showReportPopup}
              onCancel={() => this.setState({ showReportPopup: false })}
              onOkClick={(data) => this.onReportOk(data)}
            ></ReportPopup>

            {/* ???????????? */}
            <RewardPopup
              visible={this.state.showRewardPopup}
              onCancel={() => this.setState({ showRewardPopup: false })}
              onOkClick={(value) => this.onRewardSubmit(value)}
            ></RewardPopup>

            {/* ???????????? */}
            {parseContent?.REWARD?.money && parseContent?.REWARD?.remainMoney && (
              <AboptPopup
                money={Number(parseContent.REWARD.money)} // ???????????????
                remainMoney={Number(parseContent.REWARD.remainMoney)} // ??????????????????????????????
                visible={this.state.showAboptPopup}
                onCancel={() => this.onAboptCancel()}
                onOkClick={(data) => this.onAboptOk(data)}
              ></AboptPopup>
            )}

            {
              hasRedPacket > 0
              && <PacketOpen onClose={() => threadStore.setRedPacket(0)} money={hasRedPacket} />
            }
          </Fragment>
        )}
      </View>
    );
  }
}

export default ThreadH5Page;
