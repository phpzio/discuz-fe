import { getHeaderConfig } from './header';
import { getFooterConfig } from '../footer';
import { getContentConfig } from './content';
import { checkAndGetBase64Src } from '../../utils'

const posterFrameWidth = 8;
const posterWidth = 710 - posterFrameWidth * 2;

const getConfig = async ({ site, comment, miniCode, siteName , hidePart}) => {
  if (!miniCode) {
    return;
  }
  const codeUrl = await miniCode.base64Img ? checkAndGetBase64Src(miniCode.base64Img) : miniCode;
  const { height: headerHeight, config: headerConfig } = getHeaderConfig({ comment });

  const { height: contentHeight, config: contentConfig } = getContentConfig({ site, comment ,baseHeight: headerHeight, hidePart});

  const { height: footerHeight, config: footerConfig } = getFooterConfig({
    baseHeight:  contentHeight,
    codeUrl,
    siteName,
  });
  const baseConfig = {
    width: posterWidth,
    height: contentHeight + footerHeight,
    backgroundColor: '#fff',
    debug: false,
    blocks: [],
    images: [],
    texts: [],
  };
  const config = mergeObj([baseConfig, headerConfig, contentConfig, footerConfig]);

  return config;
};

const mergeObj = (arr) => {
  const numArgs = arr.length;
  if (!numArgs) {
    return {};
  }

  const base = arr[0];
  arr.forEach((item, index) => {
    if (index !== 0) {
      const keys = Object.keys(item);
      keys.forEach((key) => {
        base[key] = [...base[key], ...item[key]];
      });
    }
  });

  return base;
};

export default getConfig;
