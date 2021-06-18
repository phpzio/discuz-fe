import React, { Component } from 'react';
import Taro, { getCurrentInstance } from '@tarojs/taro';
import { View } from '@tarojs/components';
import Icon from '@discuzq/design/dist/components/icon/index';
import { observer, inject } from 'mobx-react';
import { PluginToolbar, DefaultToolbar, GeneralUpload, Title, Content, ClassifyPopup, OptionPopup, Position, Emoji } from '@components/thread-post';
import Toast from '@discuzq/design/dist/components/toast/index';
import { Units } from '@components/common';
import styles from './index.module.scss';
import { THREAD_TYPE } from '@common/constants/thread-post';
import { paidOption, draftOption } from '@common/constants/const';
import { readYundianboSignature } from '@common/server';
import VodUploader from 'vod-wx-sdk-v2';
import { toTCaptcha } from '@common/utils/to-tcaptcha'
import PayBox from '@components/payBox/index';
import { ORDER_TRADE_TYPE } from '@common/constants/payBoxStoreConstants';
import { get } from '@common/utils/get';

@inject('payBox')
@inject('index')
@inject('site')
@inject('user')
@inject('thread')
@inject('threadPost')
@observer
class Index extends Component {
  constructor() {
    super();
    this.state = {
      threadId: '', // 主题id
      postType: 'isFirst', // 发布状态 isFirst-首次，isEdit-再编辑，isDraft-草稿
      canEditRedpacket: true, // 可编辑红包
      canEditReward: true, // 可编辑悬赏
      isShowTitle: true, // 默认显示标题
      maxLength: 5000, // 文本输入最大长度
      showClassifyPopup: false, // 切换分类弹框show
      operationType: 0,
      contentTextLength: 5000,
      showEmoji: false,
      showPaidOption: false, // 显示付费选项弹框
      showDraftOption: false, // 显示草稿选项弹框
      bottomHeight: 0,
      data: {},
    }
    this.timer = null;
    this.ticket = ''; // 腾讯云验证码返回票据
    this.randstr = ''; // 腾讯云验证码返回随机字符串
    this.contentRef = React.createRef(null);
  }

  componentWillMount() { }

  async componentDidMount() {
    this.getNavHeight();
    // 监听键盘高度变化
    Taro.onKeyboardHeightChange(res => {
      this.setState({ bottomHeight: res?.height || 0 });
    });

    this.redirectToHome();
    await this.fetchCategories(); // 请求分类
    const { params } = getCurrentInstance().router;
    const id = parseInt(params.id);
    if (id) { // 请求主题
      this.setState({ threadId: id })
      this.setPostDataById(id);
    } else {
      // this.openSaveDraft(); // 现阶段，自动保存功能关闭
    }
    // 监听腾讯验证码事件
    Taro.eventCenter.on('captchaResult', this.handleCaptchaResult);
    Taro.eventCenter.on('closeChaReault', this.handleCloseChaReault);
  }

  componentDidUpdate() {
    this.redirectToHome();
  }

  componentWillUnmount() {
    // 卸载发帖页时清理定时器、事件监听、重置发帖数据
    const { resetPostData } = this.props.threadPost;
    resetPostData();
    clearInterval(this.timer);
    Taro.eventCenter.off('captchaResult', this.handleCaptchaResult);
    Taro.eventCenter.off('closeChaReault', this.handleCloseChaReault);
    // Taro.offKeyboardHeightChange(() => {});
    this.props.thread.reset();
  }

  getNavHeight() {
    const { statusBarHeight } = Taro.getSystemInfoSync();
    const menubtnRect = Taro.getMenuButtonBoundingClientRect();
    const { top = 0, height = 0, width = 0 } = menubtnRect || {};
    const navHeight = (top - statusBarHeight) * 2 + height;
    this.props.threadPost.setNavInfo({ statusBarHeight, navHeight, menubtnWidth: width })
  }

  // handle
  postToast = (title, icon = 'none', duration = 2000) => { // toast
    Taro.showToast({ title, icon, duration });
  }

  redirectToHome = () => { // 检查发帖权限，没有则重定向首页
    const { permissions } = this.props.user;
    if (permissions && permissions.createThread && !permissions.createThread.enable) {
      this.postToast('暂无发帖权限, 即将回到首页');
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/index/index' })
      }, 1000)
    }
  }

  async fetchCategories() { // 若当前store内分类列表数据为空，则主动请求分类
    const { categories, getReadCategories } = this.props.index;
    if (!categories || (categories && categories?.length === 0)) {
      await getReadCategories();
    }
  }

  async setPostDataById(id) {
    const { thread, threadPost } = this.props;
    let ret = {};

    // 再编辑时，含有主题数据，直接使用
    if (id === thread.threadData?.id && thread.threadData) {
      ret.data = thread.threadData;
      ret.code = 0;
    } else {
      ret = await thread.fetchThreadDetail(id);
    }

    if (ret.code === 0) {
      // 请求成功，设置分类，发帖数据,发帖状态，草稿状态开启自动保存
      const { categoryId, isDraft } = ret.data;
      this.setCategory(categoryId);
      const { content: { text } } = ret.data;
      // 小程序编辑帖子，要把内容中的img标签去掉。/todo: 防止把其他有效的img标签也去掉
      const realText = text.replace(/<img.*?alt="(\w+)".*?>/g, `:$1:`)
        .replace(/<br \/>/g, '\n')
        .replace(/<span.*?>(.*?)<\/span>/g, `$1`);
      ret.data.content.text = realText;
      threadPost.formatThreadDetailToPostData(ret.data);
      // const { isThreadPaid } = this.props.threadPost
      // if (isThreadPaid) {
      //   this.postToast('已经支付的帖子不支持编辑');
      //   const timer = setTimeout(() => {
      //     clearTimeout(timer);
      //     Taro.redirectTo({ url: `/subPages/thread/index?id=${id}` });
      //   }, 1000);
      //   return;
      // }
      // 更改交互：已发布帖子可以编辑内容，但是不能编辑红包或者悬赏属性
        this.setState({
          postType: isDraft ? 'isDraft' : 'isEdit',
          canEditRedpacket: isDraft,
          canEditReward: isDraft,
        });
      // isDraft && this.openSaveDraft(); // 现阶段，自动保存功能关闭
    } else {
      // 请求失败，弹出错误消息
      this.postToast(ret.msg);
    }
  }

  setCategory(categoryId) { // 设置当前主题已选分类
    const categorySelected = this.props.index.getCategorySelectById(categoryId);
    this.props.threadPost.setCategorySelected(categorySelected);
  }

  openSaveDraft = () => {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.autoSaveDraft();
    }, 120000)
  }

  autoSaveDraft = async () => {
    const { postData, setPostData } = this.props.threadPost;
    if (postData.contentText.length === 0) return;
    !postData.draft && setPostData({ draft: 1 });
    this.handleSubmit(true);
  }

  // 监听title输入
  onTitleChange = (title) => {
    const { setPostData } = this.props.threadPost;
    setPostData({ title });
  }

  // 处理文本框内容
  onContentChange = (contentText, maxLength) => {
    console.log(contentText);
    const { setPostData } = this.props.threadPost;
    setPostData({ contentText });
    this.toHideTitle();
    // this.setState({
    //   contentTextLength: maxLength - contentText.length
    // });
  }

  resetOperationType() {
    this.setState({
      operationType: ''
    });
  }

  // 点击发帖插件时回调，如上传图片、视频、附件或艾特、话题等
  handlePluginClick(item) {
    if (!this.checkAudioRecordStatus()) return;

    console.log(`item`, item)
    const { postData } = this.props.threadPost;
    // 匹配附件、图片、语音上传
    this.setState({
      operationType: item.type
    }, () => {
      // if (item.type === THREAD_TYPE.file || item.type === THREAD_TYPE.image || item.type === THREAD_TYPE.voice) {
      //   this.scrollerIntoView();
      // }
    });

    if (item.type !== THREAD_TYPE.emoji) {
      this.setState({
        showEmoji: false
      });
    }

    let nextRoute;
    switch (item.type) {
      // 根据类型分发具体操作
      case THREAD_TYPE.reward:
        if (!this.state.canEditReward) {
          return this.postToast('再编辑时不可操作悬赏');
        }
        nextRoute = '/subPages/thread/selectReward/index';
        this.resetOperationType();
        break;
      case THREAD_TYPE.goods:
        nextRoute = '/subPages/thread/selectProduct/index';
        this.resetOperationType();
        break;
      case THREAD_TYPE.redPacket:
        this.resetOperationType();
        if (!this.state.canEditRedpacket) {
          return this.postToast('再编辑时不可操作红包');
        }
        nextRoute = '/subPages/thread/selectRedpacket/index';
        break;
      case THREAD_TYPE.paid:
        this.setState({ showPaidOption: true });
        this.resetOperationType();
        break;
      case THREAD_TYPE.paidPost:
        nextRoute = `/subPages/thread/selectPayment/index?paidType=${THREAD_TYPE.paidPost}`;
        this.setState({ showPaidOption: false })
        break;
      case THREAD_TYPE.paidAttachment:
        nextRoute = `/subPages/thread/selectPayment/index?paidType=${THREAD_TYPE.paidAttachment}`;
        this.setState({ showPaidOption: false });
        break;
      case THREAD_TYPE.at:
        nextRoute = '/subPages/thread/selectAt/index';
        break;
      case THREAD_TYPE.topic:
        nextRoute = '/subPages/thread/selectTopic/index';
        break;
      case THREAD_TYPE.draft:
        this.setState({ showDraftOption: true });
        break;
      case THREAD_TYPE.saveDraft:
        this.setState({ showDraftOption: false }, () => this.handleSaveDraft());
        break;
      case THREAD_TYPE.abandonDraft:
        this.setState({ showDraftOption: false }, () => this.handlePageJump(true));
        break;
      case THREAD_TYPE.video:
        this.handleVideoUpload();
        break;
      case THREAD_TYPE.anonymity:
        if (postData.anonymous) this.props.threadPost.setPostData({ anonymous: 0 });
        else this.props.threadPost.setPostData({ anonymous: 1 });
        break;
      case THREAD_TYPE.emoji:
        this.setState({
          showEmoji: !this.state.showEmoji
        });
        break;
    }
    if (nextRoute) Taro.navigateTo({ url: nextRoute });

  }

  // 执行上传视频
  handleVideoUpload = () => {
    const { postData } = this.props.threadPost;
    if (postData.video?.id || postData.video?.threadVideoId) {
      this.postToast('只能上传一个视频');
      return;
    }
    Taro.chooseVideo({
      success: (file) => {
        this.yundianboUpload('video', file);
      },
      fail: (res) => {
        // this.postToast(res.errMsg);
      }
    });
  }

  // 执行云点播相关的上传工作
  yundianboUpload(type, file) {
    const { setPostData, createThreadVideoAudio } = this.props.threadPost;
    Taro.showLoading({
      title: '上传中',
      mask: true
    });

    let mediaFile = file;
    if (type === 'audio') {
      mediaFile = (({fileSize: size, tempFilePath}) => ({size, tempFilePath}))(file);
    }
    VodUploader.start({
      mediaFile,
      // 必填，获取签名的函数
      getSignature: async (fn) => {
        const res = await readYundianboSignature();
        const { code, data } = res;
        if (code === 0) {
          fn(data.token);
        } else {
          Taro.showToast({
            title: '上传失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      // 上传中回调，获取上传进度等信息
      progress (result) {
        console.log('progress');
        console.log(result);
      },
      // 上传完成回调，获取上传后的视频 URL 等信息
      finish: async (result) => {
        const { fileId, videoUrl: mediaUrl } = result;
        const params = { fileId, mediaUrl };
        if (type === 'audio') params.type = 1;
        const res = await createThreadVideoAudio(params);
        Taro.hideLoading();
        const { code, data } = res;
        if (code === 0) {
          if (type === 'video') {
            setPostData({
              video: {
                id: data?.id,
                thumbUrl: mediaUrl,
              },
            });
          } else if (type === 'audio') {
            setPostData({
              audio: {
                id: data?.id,
                mediaUrl,
              },
              audioSrc: mediaUrl,
              audioRecordStatus: 'uploaded',
            });
          }
          this.resetOperationType();
        } else {
          Taro.showToast({
            title: res.msg,
            icon: 'none',
            duration: 2000
          });
        }
        // this.scrollerIntoView();
      },
      // 上传错误回调，处理异常
      error (result) {
        Taro.showToast({
          title: '上传失败',
          icon: 'none',
          duration: 2000
        });
        console.log('error');
        console.log(result);
      },
    });
  }


  // 红包tag展示
  redpacketContent = () => {
    const { postData, redpacketTotalAmount: amount } = this.props.threadPost;
    const { redpacket: { rule, number, condition, likenum } } = postData;
    return `${rule === 1 ? '随机红包' : '定额红包'}\\总金额${amount}元\\${number}个${condition === 1 && likenum > 0 ?  `\\集赞个数${likenum}` : ''}`;
  }

  // 验证码滑动成功的回调
  handleCaptchaResult = (result) => {
    this.ticket = result.ticket;
    this.randstr = result.randstr;
    this.handleSubmit();
  }

  // 验证码点击关闭的回调
  handleCloseChaReault = () => {
    Taro.hideLoading();
  }

  checkAttachPrice = () => {
    const { postData } = this.props.threadPost;
    // 附件付费设置了需要判断是否进行了附件的上传
    if (postData.attachmentPrice) {
      if (!(postData.audio.id || postData.video.id
        || Object.keys(postData.images)?.length
        || Object.keys(postData.files)?.length)) return false;
      return true;
    }
    return true;
  }

  handleSubmit = async (isDraft) => {
    // 1 校验
    const { threadId } = this.state;
    const { threadPost, site } = this.props;
    const { postData, redpacketTotalAmount } = threadPost;
    const { images, video, files, audio } = postData;

    // 判断录音状态
    if (!this.checkAudioRecordStatus()) return;

    if (!(postData.contentText || video.id || audio.id || Object.values(images).length
      || Object.values(files).length)) {
      this.postToast('请至少填写您要发布的内容或者上传图片、附件、视频、语音');
      return;
    }
    if (!this.checkAttachPrice()) {
      this.postToast('请先上传附件、图片、视频或者语音');
      return;
    }
    // 2 验证码
    const { webConfig } = site;
    if (webConfig) {
      const qcloudCaptcha = webConfig?.qcloud?.qcloudCaptcha;
      const qcloudCaptchaAppId = webConfig?.qcloud?.qcloudCaptchaAppId;
      const createThreadWithCaptcha = webConfig?.other?.createThreadWithCaptcha;
      if (qcloudCaptcha && createThreadWithCaptcha) {
        if (!this.ticket || !this.randstr) {
          toTCaptcha(qcloudCaptchaAppId);
          return false;
        }
      }
    }
    // 3 将验证码信息更新到发布store
    const { setPostData } = threadPost;
    if (this.ticket && this.randstr) {
      setPostData({
        ticket: this.ticket,
        randstr: this.randstr,
      });
      this.ticket = '';
      this.randstr = '';
    }

    // 4 支付流程
    const { rewardQa, redpacket } = postData;

    // 如果是编辑的悬赏帖子，则不用再次支付
    const rewardAmount = threadPost.isThreadPaid ? 0 : (Number(rewardQa.value) || 0);
    // 如果是编辑的红包帖子，则不用再次支付
    const redAmount = threadPost.isThreadPaid ? 0 : (Number(redpacketTotalAmount) || 0);

    const amount = rewardAmount + redAmount;
    const options = { amount };
    if (!isDraft && amount > 0) {
      let type = ORDER_TRADE_TYPE.RED_PACKET;
      let title = '支付红包';
      if (redAmount) {
        options.redAmount = redAmount;
      }
      if (rewardAmount) {
        type = ORDER_TRADE_TYPE.POST_REWARD;
        title = '支付悬赏';
        options.rewardAmount = rewardAmount;
      }
      if (rewardAmount && redAmount) {
        type = ORDER_TRADE_TYPE.COMBIE_PAYMENT;
        title = '支付红包和悬赏';
      }

      // 等待支付
      PayBox.createPayBox({
        data: { ...options, title, type },
        orderCreated: async (orderInfo) => {
          const { orderSn } = orderInfo;
          setPostData({ orderInfo });
          if (orderSn) this.props.payBox.hide();
          this.createThread(true, true);
        },
        success: async () => {
          this.setIndexPageData();
          if (this.state.threadId)
            Taro.redirectTo({ url: `/subPages/thread/index?id=${this.state.threadId}` });
        },
      });
      return;
    }
    return this.createThread(isDraft);
  }

  async createThread(isDraft, isPay) {
    const { threadId } = this.state;
    const { threadPost } = this.props;
    const { setPostData } = threadPost;
    // 5 loading
    Taro.showLoading({
      title: isDraft && !isPay ? '保存草稿中...' : '发布中...',
      mask: true
    });
    // 6 根据是否存在主题id，选择更新主题、新建主题
    let ret = {};
    if (threadId) {
      ret = await threadPost.updateThread(threadId);
    } else {
      ret = await threadPost.createThread();
    }

    // 7 处理请求数据
    const { code, data, msg } = ret;
    if (code === 0) {
      if (!threadId) {
        this.setState({ threadId: data.threadId }); // 新帖首次保存草稿后，获取id
      }
      this.setState({ data });
      setPostData({ threadId: data.threadId });

      // 非草稿，跳转主题详情页
      Taro.hideLoading();

      // 未支付的订单
      if (isDraft && threadPost.postData.orderInfo.orderSn
        && !threadPost.postData.orderInfo.status
        && !threadPost.postData.draft) {
        this.props.payBox.show();
        return;
      }

      if (!isDraft) {
        this.setIndexPageData();
      }
      this.postToast('发布成功', 'success');
      Taro.redirectTo({ url: `/subPages/thread/index?id=${data.threadId}` });
      // }
      return true;
    }
    Taro.hideLoading();
    (!isDraft || isPay) && this.postToast(msg);
    return false;
  }

  setIndexPageData = () => {
    const { threadId, data } = this.state;
    const { params } = getCurrentInstance().router;
    // 更新帖子到首页列表
    if (params && params.id) {
      this.props.index.updateAssignThreadAllData(threadId, data);
      // 添加帖子到首页数据
    } else {
      const { categoryId = '' } = data;
      // 首页如果是全部或者是当前分类，则执行数据添加操作
      if (this.props.index.isNeedAddThread(categoryId)) {
        this.props.index.addThread(data);
      }
    }
  };

  // 处理用户主动点击保存草稿
  handleSaveDraft = async () => {
    const { setPostData } = this.props.threadPost;
    setPostData({ draft: 1 });
    const isSuccess = await this.handleSubmit(true);

    if (isSuccess) {
      this.postToast('保存成功', 'success');
      setTimeout(() => {
        Taro.hideLoading();
        Taro.redirectTo({ url: `/subPages/my/draft/index` });
        // this.handlePageJump(true);
      }, 1000);
    } else {
      this.postToast('保存失败');
    }
  }

  // 首次发帖，文本框聚焦时，若标题为空，则此次永久隐藏标题输入
  toHideTitle = () => {
    const { postData } = this.props.threadPost;
    const { postType, isShowTitle } = this.state;
    if (
      postType === 'isFirst'
      && isShowTitle
      && postData.contentText !== ""
      && postData.title === ""
    ) {
      this.setState({ isShowTitle: false })
    }
  }

  // 手动关闭键盘
  hideKeyboard = () => {
    Taro.hideKeyboard({
      complete: res => {
        this.setState({ bottomHeight: 0 });
      }
    })
  }

  // 处理textarea聚焦
  // onContentFocus = () => {
  //   this.setState({
  //     showEmoji: false,
  //     operationType: 0,
  //   });
  // }

  // 点击空白区域自动聚焦文本框
  handleContentFocus = () => {
    if (this.contentRef && this.state.bottomHeight === 0) {
      this.contentRef.current.focus();
    }

    this.setState({
      showEmoji: false,
      operationType: 0,
    });
  }

  checkAudioRecordStatus() {
    const { threadPost: { postData } } = this.props;
    const { audioRecordStatus } = postData;
    // 判断录音状态
    if (audioRecordStatus === 'began') {
      this.postToast('您有录制中的录音未处理，请先上传或撤销录音', 'none', 3000);
      return false;
    } else if (audioRecordStatus === 'completed') {
      this.postToast('您有录制完成的录音未处理，请先上传或撤销录音', 'none', 3000);
      return false;
    }

    return true;
  }

  // 处理左上角按钮点击跳路由
  handlePageJump = async (canJump = false, url) => {
    const { postType, threadId } = this.state;
    // 已发布主题再编辑，不可保存草稿
    if (postType === "isEdit") {
      return Taro.redirectTo({ url: `/subPages/thread/index?id=${threadId}` });
    }

    if (!this.checkAudioRecordStatus()) return;

    const { postData: { contentText, images, video, files, audio } } = this.props.threadPost;
    if (!canJump && (contentText || video.id || audio.id || Object.values(images).length || Object.values(files).length)) {
      this.setState({ showDraftOption: true });
      return;
    }

    url ? Taro.redirectTo({ url }) : Taro.navigateBack();
  }

  // scrollerIntoView() {
  //   const contentId = '#thread-post-content';
  //   const query = Taro.createSelectorQuery();
  //   query.select(contentId).boundingClientRect();
  //   query.selectViewport().scrollOffset()
  //   query.exec((res) => {
  //     const { bottom } = res[0] || {};
  //     const scrollTop = bottom + 200;
  //     Taro.pageScrollTo({
  //       scrollTop,
  //       selector: contentId,
  //       duration: 300,
  //       complete: (a, b, c) => {
  //         console.log(a,b,c)
  //       }
  //     });
  //   })
  // }

  render() {
    const { permissions } = this.props.user;
    const { categories } = this.props.index;
    const { postData, setPostData, setCursorPosition, navInfo, cursorPosition } = this.props.threadPost;
    const { rewardQa, redpacket, video, product, position, contentText = '' } = postData;
    const {
      isShowTitle,
      maxLength,
      showClassifyPopup,
      operationType,
      showPaidOption,
      showEmoji,
      showDraftOption,
      bottomHeight,
    } = this.state;
    const navStyle = {
      height: `${navInfo.navHeight}px`,
      marginTop: `${navInfo.statusBarHeight}px`,
    }
    const contentStyle = {
      marginTop: navInfo.statusBarHeight > 30 ? `${navInfo.navHeight / 2}px` : '0px',
    }
    let defaultToolbarStyle = {}
    if (showEmoji || bottomHeight) defaultToolbarStyle = { paddingBottom: '0px', height: '45px' };
    const { site } = this.props;
    const headTitle = get(site, 'webConfig.setSite.siteName', '');
    return (
      <>
        <View className={styles.container}>
          {/* 自定义顶部导航条 */}
          <View className={styles.topBar} style={navStyle}>
            <Icon name="RightOutlined" onClick={() => this.handlePageJump(false)} />
            <View className={styles['topBar-title']}>
              <View className={styles['topBar-title-inner']}>{ headTitle ?  `发布 - ${headTitle}` : '发布' }</View>
            </View>
          </View>

          {/* 内容区域，inclue标题、帖子文字、图片、附件、语音等 */}
          <View className={styles.content} style={contentStyle} onClick={this.handleContentFocus}>
            <View id="thread-post-content">
              <Title
                value={postData.title}
                show={isShowTitle}
                onChange={this.onTitleChange}
                onBlur={this.hideKeyboard}
                onFocus={() => {
                  this.setState({
                    showEmoji: false,
                    operationType: 0,
                  });
                }}
              />
              <Content
                ref={this.contentRef}
                value={postData.contentText}
                maxLength={maxLength}
                onChange={this.onContentChange}
                // onFocus={this.onContentFocus}
                onBlur={(e) => {
                  console.log('set', e.detail.cursor);
                  setCursorPosition(e.detail.cursor);
                  this.hideKeyboard();
                }}
              />

            <View className={styles.plugin} onClick={e => e.stopPropagation()}>

              <GeneralUpload type={operationType} audioUpload={(file) => { this.yundianboUpload('audio', file) }}>
                {video.thumbUrl && (
                  <Units
                    type='video'
                    deleteShow
                    src={video.thumbUrl}
                    onDelete={() => setPostData({ video: {} })}
                    onVideoLoaded={() => {
                      Taro.pageScrollTo({
                        scrollTop: 3000,
                        // selector: '#thread-post-video',
                        complete: (a,b,c) => {console.log(a,b,c)}
                      });
                    }}
                  />
                )}
              </GeneralUpload>

              {product.detailContent && <Units type='product' productSrc={product.imagePath} productDesc={product.title} productPrice={product.price} onDelete={() => setPostData({ product: {} })} />}

            </View>
            </View>
          </View>

          {/* 插入内容tag展示区 */}
          <View className={styles.tags} style={{ display: bottomHeight ? 'none' : 'block' }}>
            {(permissions?.insertPosition?.enable) &&
              <View className={styles['location-bar']}>
                <Position currentPosition={position} positionChange={(position) => {
                  setPostData({ position });
                }} />
              </View>
            }

            {(Boolean(postData.price || postData.attachmentPrice) || redpacket.price || rewardQa.value) && (
              <View className={styles['tag-toolbar']}>
                {/* 插入付费tag */}
                {(Boolean(postData.price || postData.attachmentPrice)) && (
                  <Units
                    type='tag'
                    style={{ marginTop: 0, paddingRight: '8px' }}
                    tagContent={`付费总额${(postData.price || postData.attachmentPrice).toFixed(2)}元`}
                    onTagClick={() => {
                      if (postData.price) {
                        this.handlePluginClick({ type: THREAD_TYPE.paidPost })
                      } else if (postData.attachmentPrice) {
                        this.handlePluginClick({ type: THREAD_TYPE.paidAttachment })
                      }
                    }}
                    onTagRemoveClick={() => {
                      setPostData({
                        price: 0,
                        attachmentPrice: 0
                      })
                    }}
                  />
                )}
                {/* 红包tag */}
                {redpacket.price &&
                  <Units
                    type='tag'
                    style={{ marginTop: 0, paddingRight: '8px' }}
                    tagContent={this.redpacketContent()}
                    onTagClick={() => this.handlePluginClick({ type: THREAD_TYPE.redPacket })}
                    isCloseShow={this.state.canEditRedpacket}
                    onTagRemoveClick={() => { setPostData({ redpacket: {} }) }}
                  />
                }
                {/* 悬赏tag */}
                {rewardQa.value &&
                  <Units
                    type='tag'
                    style={{ marginTop: 0, paddingRight: '8px' }}
                    tagContent={`悬赏金额${Number(rewardQa.value).toFixed(2)}元\\结束时间 ${rewardQa.times}`}
                    onTagClick={() => this.handlePluginClick({ type: THREAD_TYPE.reward })}
                    isCloseShow={this.state.canEditReward}
                    onTagRemoveClick={() => { setPostData({ rewardQa: {} }) }}
                  />
                }
              </View>
            )}
          </View>

          {/* 工具栏区域、include各种插件触发图标、发布等 */}
          <View
            className={styles.toolbar}
            style={{ transform: `translateY(-${bottomHeight}px)`, bottom: bottomHeight ? 0 : '' }}
          >
            <PluginToolbar
              operationType={operationType}
              isOpenQcloudVod={this.props.site.isOpenQcloudVod}
              permissions={permissions}
              clickCb={(item) => {
                this.handlePluginClick(item);
              }}
              onCategoryClick={() => {
                this.setState({
                  showClassifyPopup: true,
                  showEmoji: false,
                  operationType: 0
                });
              }}
              onSetplugShow={() => {
                showEmoji && this.setState({
                  showEmoji: false,
                  operationType: 0
                });
              }}
            />
            <DefaultToolbar
              style={defaultToolbarStyle}
              operationType={operationType}
              permissions={permissions}
              onPluginClick={(item) => {
                this.handlePluginClick(item);
              }}
              onSubmit={() => this.handleSubmit()}
            />
            {/* 通过键盘改变的高度一起来控制表情的显示和隐藏，直接通过 showEmoji 来进行数据的改变，渲染慢 */}
            <Emoji
              show={bottomHeight === 0 && showEmoji}
              onHide={() => {
                this.setState({
                  showEmoji: false,
                  operationType: 0
                });
              }}
              onClick={(emoji) => {
                setPostData({
                  contentText: contentText.slice(0, cursorPosition) + emoji.code + contentText.slice(cursorPosition)
                });
                setCursorPosition(cursorPosition + emoji.code.length);
              }}
            />
          </View>
        </View>

        {/* 二级分类弹框 */}
        <ClassifyPopup
          show={showClassifyPopup}
          category={categories}
          onHide={() => this.setState({ showClassifyPopup: false })}
        />
        {/* 主题付费选项弹框 */}
        <OptionPopup
          show={showPaidOption}
          list={paidOption}
          onClick={(item) => {
            if ((item.type === THREAD_TYPE.paidPost && postData.attachmentPrice) || (item.type === THREAD_TYPE.paidAttachment && postData.price)) {
              Toast.error({
                content: '帖子付费和附件付费不能同时设置',
              });
            } else {
              this.handlePluginClick(item);
            }
          }}
          onHide={() => this.setState({ showPaidOption: false })}
        />
        {/* 主题草稿选项弹框 */}
        <OptionPopup
          show={showDraftOption}
          list={draftOption}
          onClick={(item) => this.handlePluginClick(item)}
          onHide={() => this.setState({ showDraftOption: false })}
        />
      </>
    );
  }
}

export default Index;



