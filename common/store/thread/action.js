import { action } from 'mobx';
import ThreadStore from './store';
import {
  updatePosts,
  operateThread,
  readCommentList,
  readThreadDetail,
  shareThread,
  readUser,
  createReports,
  reward,
  deleteThread,
} from '@server';
import { plus } from '@common/utils/calculate';
import rewardPay from '@common/pay-bussiness/reward-pay';

class ThreadAction extends ThreadStore {
  constructor(props) {
    super(props);
  }

  @action
  async fetchAuthorInfo(userId) {
    const userRes = await readUser({ params: { pid: userId } });
    if (userRes.code === 0) {
      this.authorInfo = userRes.data;
    }

    return userRes;
  }

  /**
   * 更新列表页store
   * @param {*} IndexStore 首页store
   * @param {*} SearchStore 发现store
   * @param {*} TopicStore 话题store
   */
  @action
  async updateListStore(IndexStore, SearchStore, TopicStore) {
    const id = this.threadData?.threadId;

    if (id) {
      IndexStore?.updatePayThreadInfo && IndexStore.updatePayThreadInfo(id, this.threadData);
      SearchStore?.updatePayThreadInfo && SearchStore.updatePayThreadInfo(id, this.threadData);
      TopicStore?.updatePayThreadInfo && TopicStore.updatePayThreadInfo(id, this.threadData);
    }
  }

  /**
   * 更新评论数量
   * @param {number} count
   */
  @action
  updatePostCount(count = 0) {
    this.threadData?.likeReward && (this.threadData.likeReward.postCount = count);
  }

  /**
   * 获取帖子详细信息
   * @param {number} id 帖子id
   * @returns 帖子详细信息
   */
  @action
  async fetchThreadDetail(id) {
    const params = { threadId: id };
    const ret = await readThreadDetail({ params });
    const { code, data } = ret;
    if (code === 0) this.setThreadData(data);
    return ret;
  }

  @action
  reset() {
    this.threadData = null;
    this.commentList = null;
    this.totalCount = 0;
    this.authorInfo = null;
    this.isPositionToComment = false;
  }

  // 定位到评论位置
  @action
  positionToComment() {
    this.isPositionToComment = true;
  }

  @action
  setThreadData(data) {
    this.threadData = data;
    this.threadData.id = data.threadId;
  }

  @action
  setThreadDetailLikePayCount(data) {
    this.threadData.likeReward.likePayCount = data;
  }

  @action
  setThreadDetailLikedUsers(isLiked, userInfo) {
    const users = this.threadData?.likeReward?.users;

    if (isLiked) {
      this.threadData.likeReward.users = users?.length ? [userInfo, ...users] : [userInfo];
    } else {
      this.threadData.likeReward.users = users.filter((item) => item.userId !== userInfo.userId);
    }
  }

  @action
  setThreadDetailEssence(data) {
    this.threadData.displayTag.isEssence = data;
  }

  @action
  setThreadDetailField(key, data) {
    if (this.threadData && Reflect.has(this.threadData, key)) this.threadData[key] = data;
  }

  @action
  setCommentList(list) {
    this.commentList = list;
  }

  @action
  setCommentListDetailField(commentId, key, value) {
    if (this.commentList?.length) {
      this.commentList.forEach((comment) => {
        if (comment.id === commentId) {
          comment[key] = value;
        }
      });
    }
  }

  @action
  setReplyListDetailField(commentId, replyId, key, value) {
    if (this.commentList?.length) {
      // 查找评论
      this.commentList.forEach((comment) => {
        if (comment.id === commentId) {
          if (comment?.lastThreeComments?.length) {
            // 查找回复
            comment?.lastThreeComments.forEach((reply) => {
              if (reply.id === replyId) {
                reply[key] = value;
              }
            });
          }
        }
      });
    }
  }

  @action
  setTotalCount(data) {
    this.totalCount = data;
  }

  /**
   * 帖子收藏
   * @param { number} params.id 帖子id
   * @param { boolean} params.isFavorite 是否收藏
   * @returns {object} 处理结果
   */
  async updateFavorite(params) {
    const { id, isFavorite } = params;
    if (!id) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      id,
      isFavorite: !!isFavorite,
    };

    const res = await operateThread({ data: requestParams });

    if (res.code === 0) {
      // 3. 更新store
      this.setThreadDetailField('isFavorite', !!isFavorite);

      // 4. 返回成功
      return {
        msg: '操作成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 打赏帖子
   */
  @action
  async rewardPay(params, UserStore, IndexStore, SearchStore, TopicStore) {
    const { success, msg } = await rewardPay(params);

    // 支付成功重新请求帖子数据
    if (success) {
      this.setThreadDetailField('isReward', true);
      this.threadData.likeReward.likePayCount = (this.threadData.likeReward.likePayCount || 0) + 1;
      this.setThreadDetailLikePayCount(this.threadData.likeReward.likePayCount);

      // 更新打赏的用户
      const currentUser = UserStore?.userInfo;
      if (currentUser) {
        const user = {
          avatar: currentUser.avatarUrl,
          userId: currentUser.id,
          userName: currentUser.username,
        };
        this.setThreadDetailLikedUsers(true, user);
      }

      // 更新列表store
      this.updateListStore(IndexStore, SearchStore, TopicStore);

      return {
        success: true,
        msg: '打赏成功',
      };
    }

    return {
      success: false,
      msg: msg || '打赏失败',
    };
  }

  /**
   * 帖子点赞
   * @param {object} parmas * 参数
   * @param {number} parmas.id * 帖子id
   * @param {number} parmas.pid * 帖子评论od
   * @param {boolean} params.isLiked 是否点赞
   * @returns {object} 处理结果
   */
  @action
  async updateLiked(params, IndexStore, UserStore, SearchStore, TopicStore) {
    const { id, pid, isLiked } = params;
    if (!id || !pid) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      id,
      pid,
      data: {
        attributes: {
          isLiked: !!isLiked,
        },
      },
    };
    const res = await updatePosts({ data: requestParams });

    if (res?.data && res.code === 0) {
      this.setThreadDetailField('isLike', !!isLiked);
      this.setThreadDetailLikePayCount(res.data.likePayCount);

      // 更新点赞的用户
      const currentUser = UserStore?.userInfo;
      if (currentUser) {
        const user = {
          avatar: currentUser.avatarUrl,
          userId: currentUser.id,
          userName: currentUser.username,
        };
        this.setThreadDetailLikedUsers(!!isLiked, user);
      }

      // 更新列表store
      this.updateListStore(IndexStore, SearchStore, TopicStore);

      return {
        msg: '操作成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 帖子置顶
   * @param {object} parmas * 参数
   * @param {number} parmas.id * 帖子id
   * @param {boolean} params.isStick 是否置顶
   * @returns {object} 处理结果
   */
  @action
  async updateStick(params) {
    const { id, isStick } = params;
    if (!id) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      id,
      isSticky: !!isStick,
    };
    const res = await operateThread({ data: requestParams });

    if (res?.data && res.code === 0) {
      this.setThreadDetailField('isStick', !!isStick);

      return {
        msg: '操作成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 帖子加精
   * @param {object} parmas * 参数
   * @param {number} parmas.id * 帖子id
   * @param {boolean} params.isEssence 是否加精
   * @returns {object} 处理结果
   */
  @action
  async updateEssence(params) {
    const { id, isEssence } = params;
    if (!id) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      id,
      isEssence: !!isEssence,
    };

    const res = await operateThread({ data: requestParams });

    if (res?.data && res.code === 0) {
      this.setThreadDetailEssence(!!isEssence);

      return {
        msg: '操作成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  // TODO:帖子支付
  async pay() {}

  /**
   * 帖子删除
   * @param { number } * id 帖子id
   * @returns {object} 处理结果
   */
  @action
  async delete(id, IndexStore) {
    if (!id) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      threadId: id,
      // isDeleted: 1,
    };
    const res = await deleteThread({ data: requestParams });

    if (res.code === 0) {
      this.setThreadDetailField('isDelete', 1);

      // TODO: 删除帖子列表中的数据
      // IndexStore

      return {
        msg: '操作成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 分享
   * @param {number} threadId 帖子id
   */
  @action
  async shareThread(threadId) {
    if (!threadId) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      threadId,
    };
    const res = await shareThread({ data: requestParams });

    if (res.code === 0) {
      this.threadData.likeReward.shareCount = this.threadData?.likeReward?.shareCount - 0 + 1;

      return {
        msg: '操作成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 加载评论列表
   * @param {object} parmas * 参数
   * @param {number} parmas.id * 帖子id
   * @param {number} parmas.page 页码
   * @param {number} parmas.perPage 页码
   * @param {string} params.sort 'createdAt' | '-createdAt' 排序条件
   * @returns {object} 处理结果
   */
  @action
  async loadCommentList(params) {
    const { id, page = 1, perPage = 5, sort = 'createdAt' } = params;
    if (!id) {
      return {
        msg: '帖子id不存在',
        success: false,
      };
    }

    const requestParams = {
      filter: {
        thread: Number(id),
      },
      sort,
      page,
      perPage,
    };

    const res = await readCommentList({ params: requestParams });

    if (res.code === 0 && res?.data?.pageData) {
      let { commentList } = this;

      page === 1 ? (commentList = res?.data?.pageData || []) : commentList.push(...(res?.data?.pageData || []));

      this.setCommentList(this.commentListAdapter(commentList));
      this.setTotalCount(res?.data?.totalCount || 0);

      return {
        msg: '操作成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 关注
   * @param {object} userId * 被关注人id
   * @param {object} UserStore * userstore
   * @returns {object} 处理结果
   */
  @action
  async postFollow(userId, UserStore) {
    const res = await UserStore.postFollow(userId);

    if (res.success && res.data) {
      this.authorInfo.follow = res.data.isMutual ? 2 : 1;
      this.authorInfo.fansCount = this.authorInfo.fansCount + 1;

      return {
        msg: '操作成功',
        success: true,
      };
    }
    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 取消关注
   * @param {object} userId * 被关注人id
   * @param {object} type * 关注类型
   * @param {object} UserStore * userstore
   * @returns {object} 处理结果
   */
  @action
  async cancelFollow({ id, type }, UserStore) {
    const res = await UserStore.cancelFollow({ id, type });

    if (res.success && res.data) {
      this.authorInfo.follow = 0;
      this.authorInfo.fansCount = this.authorInfo.fansCount - 1;

      return {
        msg: '操作成功',
        success: true,
      };
    }
    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 举报
   * @param {object} search * 搜索值
   * @returns {object} 处理结果
   */
  @action
  async createReports(params) {
    const { threadId, type, reason, postId, userId } = params;

    const requestParams = {
      threadId,
      type,
      reason,
      postId,
      userId,
    };

    const res = await createReports({ data: requestParams });

    if (res.code === 0 && res.data) {
      return {
        msg: '操作成功',
        success: true,
      };
    }
    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 采纳
   * @param {object} search * 搜索值
   * @returns {object} 处理结果
   */
  @action
  async reward(params) {
    const { threadId, postId, rewards } = params;

    const requestParams = {
      threadId,
      postId,
      rewards,
    };

    const res = await reward({ data: requestParams });

    if (res.code === 0) {
      // 更新store
      this.commentList.forEach((comment) => {
        if (comment.id === postId) {
          comment.rewards = plus(Number(comment.rewards), Number(rewards));
        }
      });

      return {
        msg: '操作成功',
        success: true,
      };
    }
    return {
      msg: res.msg,
      success: false,
    };
  }

  // 适配器
  commentListAdapter(list = []) {
    list.forEach((item) => {
      const { lastThreeComments } = item;
      if (lastThreeComments?.length > 1) {
        item.lastThreeComments = [lastThreeComments[0]];
      }
    });
    return list;
  }
}

export default ThreadAction;
