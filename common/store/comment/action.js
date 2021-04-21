import { action } from 'mobx';
import CommentStore from './store';

class CommentAction extends CommentStore {
  constructor(props) {
    super(props);
  }

  @action
  setCommentDetail(data) {
    this.commentDetail = data;
  }

  @action
  addReplyToList(data) {
    (this.commentDetail?.commentPosts || []).push(data);
  }

  @action
  setThreadId(id) {
    this.threadId = id;
  }
}

export default CommentAction;
