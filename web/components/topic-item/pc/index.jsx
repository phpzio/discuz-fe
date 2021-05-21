import React, { useCallback, useMemo } from 'react';
import { Icon, RichText } from '@discuzq/design';
import styles from './index.module.scss';
import { handleAttachmentData, noop } from '@components/thread/utils';
import replaceSearchResultContent from '@common/utils/replace-search-result-content';
import s9e from '@common/utils/s9e';
import xss from '@common/utils/xss';

/**
 * 话题组件
 * @prop {title:string, content:string, hotCount:number, contentCount:number} data 话题数据
 * @prop {function} onClick 话题点击事件
 * @prop {number} index
 */
const TopicItem = ({ data, onClick = noop, index, footer }) => {
  const click = useCallback((e) => {
    if (e.target.localName === 'a') {
      return
    }
    onClick && onClick(data);
  }, [data, onClick]);
  
  const { threads = [] } = data

  const {
    text = '暂无内容',
    imageData = []
  } = handleAttachmentData(data?.threads[0]?.content);

  
  const filterContent = useMemo(() => {
    let newContent = replaceSearchResultContent(text);
    newContent = s9e.parse(newContent);
    newContent = xss(newContent);

    return newContent;
  }, [threads]);

  return (
    <div className={styles.item} onClick={click}>
      <div className={styles.imgBox}>
        { imageData.length > 0 && imageData[0].thumbUrl ? (
            <img className={styles.img} src={imageData[0].thumbUrl}/>
          ) : `${data.content[0]}`
        }
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{data.content ? `#${data.content}#`: '暂无标题'}</div>
        <div className={styles.num}>
          <div className={styles.numItem}>
            <Icon name="EyeOutlined" size={14} color="#8590A6" className={styles.numIcon}/>
            {data.viewCount}
          </div>
          <div className={styles.viewBox}>
            <Icon name="MessageOutlined" size={14} color="#8590A6" className={styles.numIcon}/>
            {data.threadCount}
          </div>
        </div>
        {
          text ? (
            <div className={styles.richContent}>
              <RichText onClick={click} className={styles.richText} content={filterContent} />
            </div>
          ) : (
            <div className={styles.text}>{text || '暂无内容'}</div>
          )
        }
      </div>
    </div>
  );
};

export default React.memo(TopicItem);
