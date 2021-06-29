import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Image } from '@tarojs/components';
import Avatar from '@discuzq/design/dist/components/avatar/index';
import Toast from '@discuzq/design/dist/components/toast/index';
import { diffDate } from '@common/utils/diff-date';

import { inject, observer } from 'mobx-react';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

const DialogBox = (props) => {
  // const { shownMessages, dialogBoxRef } = props;

  const { message, user, dialogId, showEmoji, keyboardHeight, hideEmoji, scrollEnd, messagesHistory } = props;
  const { readDialogMsgList, dialogMsgList, dialogMsgListLength, updateDialog } = message;


  const [paddingBottom, setPaddingBottom] = useState(52);

  // const [previewerVisibled, setPreviewerVisibled] = useState(false);
  // const [defaultImg, setDefaultImg] = useState('');
  // const router = useRouter();
  // const dialogId = router.query.dialogId;
  const dialogBoxRef = useRef();
  const timeoutId = useRef();
  useEffect(() => {
    return () => clearTimeout(timeoutId.current);
  }, []);

  useEffect(() => {
    if (dialogId) {
      clearTimeout(timeoutId.current);
      updateMsgList();
    }
  }, [dialogId]);

  useEffect(() => {
    if (showEmoji || keyboardHeight) {
      setTimeout(scrollEnd, 300);
    }

    setTimeout(() => {
      let query = Taro.createSelectorQuery();
      query.select('#operation-box').boundingClientRect(rect => {
        let clientHeight = rect.height;
        // let clientWidth = rect.width;
        // let ratio = 750 / clientWidth;
        // let height = clientHeight * ratio;


        setPaddingBottom(clientHeight);
        setTimeout(scrollEnd, 300);
      }).exec();
    }, 0);

  }, [showEmoji, keyboardHeight]);



  // 每5秒轮询一次
  const updateMsgList = () => {
    readDialogMsgList(dialogId);
    clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(() => {
      updateMsgList();
    }, 20000);
  };



  const [previewImageUrls, setPreviewImageUrls] = useState([]);
  useMemo(() => {
    setPreviewImageUrls(dialogMsgList.list.filter(item => !!item.imageUrl).map(item => item.imageUrl).reverse());
  }, [dialogMsgList]);

  return (
    <View
      onClick={() => {
        hideEmoji();
      }}
      className={styles.dialogBox}
      style={{
        paddingBottom: `${paddingBottom}px`,
        // marginBottom: keyboardHeight ? 0 : '',
      }}
      ref={dialogBoxRef}>
      <View className={styles.box__inner}>
        {messagesHistory.map(({ timestamp, displayTimePanel, text, ownedBy, userAvatar, imageUrl, userId, nickname, width, height }, idx) => (
          <React.Fragment key={idx}>
            {displayTimePanel && timestamp && <View className={styles.msgTime}>{timestamp}</View>}
            <View className={(ownedBy === 'myself' ? `${styles.myself}` : `${styles.itself}`) + ` ${styles.persona}`}>
              <View className={styles.profileIcon} onClick={() => {
                userId && Taro.navigateTo({ url: `/subPages/user/index?id=${userId}` });
              }}>
                {userAvatar
                  ? <Avatar image={userAvatar} circle={true} />
                  : <Avatar text={nickname && nickname.toUpperCase()[0]} circle={true} style={{
                    backgroundColor: "#8590a6",
                  }} />
                }
              </View>
              {imageUrl ? (
                <Image
                  className={styles.msgImage}
                  mode={height ? "aspectFill" : "widthFix"}
                  style={{ width: `${width}px`, height: height ? `${height}px` : "auto" }}
                  src={imageUrl}
                  onClick={() => {
                    Taro.previewImage({
                      current: imageUrl,
                      urls: previewImageUrls
                    });
                  }}
                  onLoad={scrollEnd}
                />
              ) : (
                <View className={styles.msgContent} dangerouslySetInnerHTML={{
                  __html: text,
                }}></View>
              )}
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

export default inject('message', 'user')(observer(DialogBox));
