import React, { useEffect, useState, useMemo } from 'react';
import { View } from '@tarojs/components';
import { inject, observer } from 'mobx-react';
import Taro from '@tarojs/taro';
import DialogBox from './dialog-box';
import InteractionBox from './interaction-box';
import styles from './index.module.scss';
import constants from '@common/constants';
import locals from '@common/utils/local-bridge';
import { getMessageImageSize } from '@common/utils/get-message-image-size';
import { getMessageTimestamp } from '@common/utils/get-message-timestamp';

const Index = ({ message, user, site, dialogId: _dialogId, username, nickname, threadPost }) => {

  const { clearMessage, readDialogMsgList, dialogMsgListLength, dialogMsgList, updateDialog, createDialogMsg, createDialog, readDialogIdByUsername } = message;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [dialogId, setDialogId] = useState(_dialogId);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [typingValue, setTypingValue] = useState('');

  const scrollEnd = () => {
    setTimeout(() => {
      Taro.pageScrollTo({
        scrollTop: 30000,
        duration: 0
      });
    }, 0);
  };

  const doSubmitClick = async () => {
    setShowEmoji(false);
    if (!typingValue.trim()) return;
    submit({ messageText: typingValue, isImage: false });
  };

  const submit = async (data) => {
    if (isSubmiting) return;
    let ret = {};
    if (dialogId) {
      setIsSubmiting(true);
      ret = await createDialogMsg({
        dialogId,
        ...data,
      });
      setIsSubmiting(false);
      Taro.hideLoading();
      if (ret.code === 0) {
        if (!data.imageUrl) setTypingValue('');
        readDialogMsgList(dialogId);
      } else {
        Toast.error({ content: ret.msg });
      }
    }

    if (!dialogId && username) {
      setIsSubmiting(true);
      ret = await createDialog({
        recipientUsername: username,
        ...data,
      });
      setIsSubmiting(false);
      Taro.hideLoading();
      if (ret.code === 0) {
        if (!data.imageUrl) setTypingValue('');
        updateDialogId(ret.data.dialogId);
      } else {
        Toast.error({ content: ret.msg });
      }
    }
  };

  // 触发图片选择
  const chooseImage = () => {
    Taro.chooseImage({
      count: 1,
      success(res) {
        onImgChange(res.tempFiles)
      }
    });
  };

  const onImgChange = async (files) => {
    // 图片上传前校验
    // if (!beforeUpload(files)) return;

    const { envConfig } = site;
    const file = files[0];
    const tempFilePath = file.path;
    const token = locals.get(constants.ACCESS_TOKEN_NAME);
    Taro.showLoading({
      title: '图片发送中...',
      mask: true
    });
    Taro.uploadFile({
      url: `${envConfig.COMMON_BASE_URL}/apiv3/attachments`,
      filePath: tempFilePath,
      name: 'file',
      header: {
        'Content-Type': 'multipart/form-data',
        'authorization': `Bearer ${token}`
      },
      formData: {
        'type': 1
      },
      success(res) {
        Taro.hideLoading();
        if (res.statusCode === 200) {
          const ret = JSON.parse(res.data);
          const { Data: data, Code, Message: msg } = ret;
          if (Code === 0) {
            submit({
              imageUrl: data.url,
              attachmentId: data.id,
              isImage: true,
            });
          } else {
            Toast.error({ content: msg || '图片发送失败' });
          }
        } else {
          Toast.error({ content: '网络发生错误' });
        }
      },
      fail(res) {
        console.log(res);
      }
    });
  };

  // 图片上传之前，true-允许上传，false-取消上传
  const beforeUpload = (cloneList) => {
    const { webConfig } = site;
    if (!webConfig) return false;
    const file = cloneList[0];
    const { supportImgExt, supportMaxSize } = webConfig.setAttach;
    const imageType = file.path.match(/\.([^\.]+)$/)[1].toLocaleLowerCase();
    const imageSize = file.size;
    const isLegalType = supportImgExt.toLocaleLowerCase().includes(imageType);
    const isLegalSize = imageSize > 0 && imageSize < supportMaxSize * 1024 * 1024;

    if (!isLegalType) {
      Toast.info({ content: `仅支持${supportImgExt}类型的图片` });
      return false;
    }

    if (!isLegalSize) {
      Toast.info({ content: `仅支持0 ~ ${supportMaxSize}MB的图片` });
      return false;
    }

    return true;
  };

  const messagesHistory = useMemo(() => {
    setTimeout(() => {
      scrollEnd();
      // 把消息状态更新为已读
      updateDialog(dialogId);
    }, 100);

    const _list = dialogMsgList.list.map((item) => {
      let [width, height] = [150, 150]; // 兼容没有返回图片尺寸的旧图片
      if (item.imageUrl) {
        const size = item.imageUrl.match(/\?width=(\d+)&height=(\d+)$/);
        if (size) {
          [width, height] = getMessageImageSize(size[1], size[2]); // 计算图片显示尺寸
        }
      }

      return {
        timestamp: item.createdAt,
        userAvatar: item.user.avatar,
        displayTimePanel: true,
        textType: 'string',
        text: item.messageTextHtml,
        ownedBy: user.id === item.userId ? 'myself' : 'itself',
        imageUrl: item.imageUrl,
        width: width,
        height: height,
        userId: item.userId,
        nickname: item.user.username,
      }
    });

    return getMessageTimestamp(_list.filter(item => (item.imageUrl || item.text)).reverse());
  }, [dialogMsgListLength]);

  useEffect(async () => {
    if (username && !dialogId) {
      const res = await readDialogIdByUsername(username);
      const { code, data: { dialogId } } = res;
      if (code === 0 && dialogId) {
        updateDialogId(dialogId);
      }
    }

    if (!threadPost.emojis.length) {
      threadPost.fetchEmoji();
    }

    return () => {
      Taro.hideLoading();
    };
  }, []);

  useEffect(() => {
    setDialogId(_dialogId);

    // 监听键盘高度变化
    Taro.onKeyboardHeightChange(res => {
      setKeyboardHeight(res?.height || 0);
    });

    return () => {
      clearMessage();
    };
  }, []);

  return (
    <View className={styles.container}>
      <DialogBox
        messagesHistory={messagesHistory}
        scrollEnd={scrollEnd}
        dialogId={dialogId}
        showEmoji={showEmoji}
        hideEmoji={() => {
          setShowEmoji(false);
        }}
        keyboardHeight={keyboardHeight}
      />
      <InteractionBox
        doSubmitClick={doSubmitClick}
        typingValue={typingValue}
        setTypingValue={setTypingValue}
        chooseImage={chooseImage}
        username={username}
        keyboardHeight={keyboardHeight}
        showEmoji={showEmoji}
        dialogId={dialogId}
        switchEmoji={(show) => {
          setShowEmoji(show);
        }}
        updateDialogId={(dialogId) => {
          setDialogId(dialogId);
        }}
      />
    </View>
  );
};

export default inject('message', 'user', 'threadPost', 'site')(observer(Index));