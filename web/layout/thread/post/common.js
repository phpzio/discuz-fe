import locals from '@common/utils/local-bridge';
const threadPostData = '__dzq-thread-postdata';
const categoryEmoji = '__dzq-category-emoji';

/**
 * 设置创建帖子数据的本地缓存
 * @param {object} data 要创建的postData
 */
export const setThreadPostDataLocal = (data) => {
  locals.set(threadPostData, data);
};

/**
 * 从本地缓存获取要创建的帖子数据
 * @returns 要创建的postData
 */
export const getThreadPostDataLocal = () => locals.get(threadPostData);

/**
 * 删除本地存储的要创建的帖子数据
 */
export const removeThreadPostDataLocal = () => {
  locals.remove(threadPostData);
};

export const setCategoryEmoji = (data) => {
  locals.set(categoryEmoji, data);
};

export const getCategoryEmoji = () => locals.get(categoryEmoji);

export const removeCategory = () => {
  locals.remove(categoryEmoji);
};
