import React from 'react';

import styles from './index.module.scss';

/**
 * 帖子奖励进度条
 * @prop {POST_TYPE} type 类型
 * @prop {string | number} remaining 红包帖子：剩余数量, 赏金帖子：剩余多少元
 * @prop {string | number} received 红包帖子：已领取数量 , 赏金帖子：已发放多少元
 */

const Index = ({ type = POST_TYPE.RED_PACK, remaining = 0, received = 0 }) => {
  let texts = {};
  let className = '';

  if (type === POST_TYPE.RED_PACK) {
    texts = {
      remaining: (
        <>
          剩余<span className={styles.count}>{remaining}</span>个
        </>
      ),
      received: `已领取${received}个`,
      receive: '评论领红包',
    };
    className = styles.redPack;
  } else if (type === POST_TYPE.BOUNTY) {
    texts = {
      remaining: (
        <>
          剩余<span className={styles.count}>{remaining}</span>元
        </>
      ),
      received: `已发放${received}元`,
    };
    className = styles.bounty;
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <img className={styles.icon} />
      <div className={styles.remaining}>{texts.remaining}</div>
      <div className={styles.received}>{texts.received}</div>
      {texts.receive && <div className={styles.receive}>{texts.receive}</div>}
    </div>
  );
};

export const POST_TYPE = {
  RED_PACK: Symbol('红包'),
  BOUNTY: Symbol('赏金'),
};

export default React.memo(Index);
