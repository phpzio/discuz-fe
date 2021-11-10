/**
 * @description 部分付费页面组件
 * @author fishcui
 */
import React from 'react';
import TextUnit from '@components/thread/all-post-paid/part-paid/units/textUnit';
import ImageUnit from '@components/thread/all-post-paid/part-paid/units/imageUnit';
import VideoUnit from '@components/thread/all-post-paid/part-paid/units/videoUnit';
import AudioUnit from '@components/thread/all-post-paid/part-paid/units/audioUnit';
import AttachmentUnit from '@components/thread/all-post-paid/part-paid/units/attachmentUnit';
import PriceUnit from '@components/thread/all-post-paid/part-paid/units/priceUnit';

class PartPaid extends React.Component {
  render() {
    return (
      <div>
        <TextUnit />
        <ImageUnit />
        <VideoUnit />
        <AudioUnit />
        <AttachmentUnit />
        <PriceUnit />
      </div>
    );
  }
}

export default PartPaid;