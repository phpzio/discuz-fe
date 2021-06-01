import { action } from 'mobx';
import CommentStore from './store';
import { readCommentDetail, updateComment, createPosts, updatePosts, readUser, deleteFollow } from '@server';
import xss from '@common/utils/xss';

class CommentAction extends CommentStore {
  constructor(props) {
    super(props);
  }

  /**
   * 获取评论详情
   * @param {number} id 评论id
   * @returns 详细信息
   */
  @action
  async fetchCommentDetail(id) {
    const res = await readCommentDetail({ params: { pid: Number(id) } });
    if (res?.code === 0) {
      this.setCommentDetail(res.data);
    } else {
      this.reset();
      this.isServerError = true;
    }
    this.isLoading = false;

    return res;
  }

  @action
  async fetchAuthorInfo(userId) {
    const userRes = await readUser({ params: { pid: userId } });
    if (userRes.code === 0) {
      this.authorInfo = userRes.data;
    } else {
      this.isAuthorInfoError = true;
    }

    return userRes;
  }

  @action
  reset() {
    this.commentDetail = null;
    this.threadId = null;
    this.authorInfo = null;
  }

  @action
  setCommentDetail(data) {
    this.commentDetail = data;
    if (this.commentDetail) {
      this.commentDetail.commentPosts = this?.commentDetail?.commentPosts || [];
      this.commentDetail.lastThreeComments = this.commentDetail.commentPosts;
    }
  }

  @action
  setCommentDetailField(key, data) {
    if (this.commentDetail && Reflect.has(this.commentDetail, key)) this.commentDetail[key] = data;
  }

  @action
  setReplyListDetailField(replyId, key, value) {
    if (this.commentDetail?.lastThreeComments?.length) {
      this.commentDetail.lastThreeComments.forEach((reply) => {
        if (reply.id === replyId) {
          reply[key] = value;
        }
      });
    }
  }

  @action
  addReplyToList(data) {
    (this.commentDetail?.commentPosts || []).push(data);
  }

  @action
  setThreadId(id) {
    this.threadId = id;
  }

  /**
   * 创建评论
   * @param {object} params * 参数
   * @param {number} params.id * 帖子id
   * @param {string} params.content * 评论内容
   * @param {array} params.attachments 附件内容
   * @param {boolen} params.sort 当前排序  ture 评论从旧到新 false 评论从新到旧
   * @param {boolen} params.isNoMore 是否没有更多
   * @returns {object} 处理结果
   */
  @action
  async createComment(params, ThreadStore) {
    const { id, content, attachments, postId, sort, isNoMore } = params;
    if (!id || !content) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      id,
      content: xss(content),
      replyId: postId,
      attachments,
    };

    const res = await createPosts({ data: requestParams });

    if (res.code === 0 && res?.data?.id) {
      const { commentList, totalCount } = ThreadStore;

      const newTotalCount = totalCount + 1;
      ThreadStore && ThreadStore.setTotalCount(newTotalCount);
      const newData = res.data;
      newData.lastThreeComments = [];

      // 头部添加评论
      if (sort === false) {
        commentList.unshift(newData);
        ThreadStore && ThreadStore.setCommentList(commentList);
      }

      // 尾部添加评论
      if (sort === true && isNoMore === true) {
        commentList.push(newData);
        ThreadStore && ThreadStore.setCommentList(commentList);
      }

      return {
        msg: '评论成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 修改评论
   * @param {object} params * 参数
   * @param {number} params.id * 帖子id
   * @param {number} params.pid * 评论id
   * @param {string} params.content * 评论内容
   * @param {array} params.attachments 附件内容
   * @returns {object} 处理结果
   */
  @action
  async updateComment(params, ThreadStore) {
    const { id, pid, content, attachments } = params;
    if (!id || !content || !pid) {
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
          content: xss(content),
          attachments,
        },
      },
    };

    const res = await updatePosts({ data: requestParams });

    if (res.code === 0 && res?.data?.content && ThreadStore) {
      const { commentList } = ThreadStore;

      // 更新列表中的评论
      (commentList || []).forEach((comment) => {
        if (comment.id === pid) {
          comment.content = res.data.content;
        }
      });

      return {
        msg: '评论成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 创建回复：回复评论 + 回复回复
   * @param {object} params * 参数
   * @param {number} params.id * 帖子id
   * @param {number} params.commentId * 评论id
   * @param {number} params.replyId * 回复id
   * @param {boolean} params.isComment 是否楼中楼
   * @param {string} params.content * 评论内容
   * @param {array} params.attachments 附件内容
   * @param {array} params.commentPostId 评论回复ID
   * @param {array} params.commentUserId 评论回复用户id
   * @returns {object} 处理结果
   */
  @action
  async createReply(params, ThreadStore) {
    const { id, commentId, replyId, commentPostId, content, isComment, attachments } = params;
    if (!id || !content || !replyId || !commentId) {
      return {
        msg: '参数不完整',
        success: false,
      };
    }

    const requestParams = {
      id,
      replyId,
      content: xss(content),
      isComment,
      attachments,
      commentPostId,
    };

    const res = await createPosts({ data: requestParams });

    if (res.code === 0 && res?.data?.id && ThreadStore) {
      const { commentList } = ThreadStore;

      // 更新评论列表中的回复数据
      if (commentList?.length) {
        commentList.forEach((comment) => {
          if (commentId === comment.id) {
            comment.replyCount = comment.replyCount + 1;
            comment.lastThreeComments.splice(0, 1, res.data);
          }
        });
      }

      // 更新回复列表
      this.addReplyToList(res.data);

      return {
        msg: '回复成功',
        success: true,
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 点赞: 评论点赞 + 回复点赞
   * @param {object} parmas * 参数
   * @param {number} parmas.id * 评论id
   * @param {boolean} params.isLiked 是否点赞
   * @returns {object} 处理结果
   */
  @action
  async updateLiked(params) {
    const { id, isLiked } = params;
    if (!id) {
      return {
        msg: '评论id不存在',
        success: false,
      };
    }

    const requestParams = {
      pid: id,
      data: {
        attributes: {
          isLiked,
        },
      },
    };
    const res = await updateComment({ data: requestParams });

    if (res?.data && res.code === 0) {
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
   * 删除评论
   * @param {number} commentId * 评论id
   * @returns {object} 处理结果
   */
  @action
  async delete(commentId, ThreadStore) {
    if (!commentId) {
      return {
        success: false,
        msg: '评论id不存在',
      };
    }
    const requestParams = {
      pid: commentId,
      data: {
        attributes: {
          isDeleted: 1,
        },
      },
    };
    const res = await updateComment({ data: requestParams });
    if (res.code === 0 && ThreadStore) {
      // 更新评论列表
      const { commentList, totalCount } = ThreadStore;
      if (commentList?.length) {
        const index = commentList.findIndex((comment) => commentId === comment.id);
        commentList.splice(index, 1);
        const newTotalCount = totalCount - 1;
        ThreadStore.setTotalCount(newTotalCount);
      }

      return {
        success: true,
        msg: '删除成功',
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  //------------------------------------------------------------------------------




  /**
   * 删除回复评论1
   * @param {number} replyId * 评论回复id
   * @returns {object} 处理结果
   */
  @action
  async deleteReplyComment1(replyId, ThreadStore) {
    console.log('ThreadStore',ThreadStore)
    if (!replyId) {
      return {
        success: false,
        msg: '回复评论id不存在',
      };
    }
    const requestParams = {
      pid: replyId,
      data: {
        attributes: {
          isDeleted: 1,
        },
      },
    };
    const { commentList } = ThreadStore
    const res = await updateComment({ data: requestParams });
    if (res.code === 0) {
      console.log('commentList',commentList)
      // 更新评论回复列表
      commentList.map((v) => {
        const index = v.lastThreeComments.findIndex((val) => replyId === val.id)
        v.replyCount = v.replyCount - 1;
        v.lastThreeComments.splice(index,1)
      })
      return {
        success: true,
        msg: '删除成功',
      };
    }
    return {
      msg: res.msg,
      success: false,
    };
  }

  /**
   * 删除回复评论
   * @param {number} replyId * 评论回复id
   * @returns {object} 处理结果
   */
  @action
  async deleteReplyComment(replyId, ReplyList) {
    // console.log('replylist',ReplyList)
    if (!replyId) {
      return {
        success: false,
        msg: '回复评论id不存在',
      };
    }
    const requestParams = {
      pid: replyId,
      data: {
        attributes: {
          isDeleted: 1,
        },
      },
    };

    const res = await updateComment({ data: requestParams });
    if (res.code === 0 && ReplyList) {
      // 更新评论回复列表
      if (ReplyList?.length) {
        const index = ReplyList.findIndex((reply) => replyId === reply.id);
        ReplyList.splice(index, 1);
      }

      return {
        success: true,
        msg: '删除成功',
      };
    }

    return {
      msg: res.msg,
      success: false,
    };
  }

  //------------------------------------------------------------------------------
  /**
   * 获取回复详情
   * @param {object} parmas * 参数
   * @param {number} parmas.id * 评论id
   * @returns {object} 处理结果
   */
  @action
  async getCommentDetail(params) {
    const { id } = params;

    if (!id) {
      return {
        msg: '评论id不存在',
        success: false,
      };
    }

    const requestParams = {
      pid: id,
    };

    const res = await readCommentDetail({ params: requestParams });

    if (res.code === 0 && res?.data?.id) {
      this.setCommentDetail(res.data);

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
   * @param {object} search * 搜索值
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
   * 采纳
   * @param {object} search * 搜索值
   * @returns {object} 处理结果
   */
  @action
  async reward({ id, type }) {
    const res = await deleteFollow({ data: { id, type: type } });
    if (res.code === 0 && res.data) {
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
}

export default CommentAction;
